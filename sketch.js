const graphSize = 400;
let agents = [];
let cooperations = 0;
let total_payoff = 0;

let numAgents;
let numInteractions;
let killFraction;
let fraction;
let kx;
let ky;

let agentColor;
let hLineColor;
let vLineColor;
let canvas;
let stats;

const numAgentsSlider = document.getElementById('num-agents');
const numInteractionsSlider = document.getElementById('num-interactions');
const killFractionSlider = document.getElementById('kill-fraction');
const restartButton = document.getElementById('restart-button');
const nAgentsText = [...document.getElementsByClassName('nagents-text')];
const nInteractionsText = [...document.getElementsByClassName('ninteractions-text')];
const fractionText = [...document.getElementsByClassName('fraction-text')];

restartButton.addEventListener('click', restart);
numAgentsSlider.addEventListener('input', () => nAgentsText.forEach(t => t.innerHTML = numAgentsSlider.value));
numInteractionsSlider.addEventListener('input', () => nInteractionsText.forEach(t => t.innerHTML = numInteractionsSlider.value));
killFractionSlider.addEventListener('input', () => fractionText.forEach(t => t.innerHTML = int(killFractionSlider.value*100)));

function recompute_params() {
    numAgents = int(numAgentsSlider.value);
    numInteractions = int(numInteractionsSlider.value);
    killFraction = float(killFractionSlider.value);
    fraction = Math.floor(killFraction * numAgents);
    kx = graphSize/numInteractions/2/2;
    ky = graphSize/numInteractions/2;
}

function setup() {
    canvas = createCanvas(2*graphSize+10, graphSize);
    canvas.parent('graph');

    stats = createGraphics(graphSize, graphSize);

    agentColor = color(0, 255, 0, 80);
    hLineColor = color(255, 255, 255, 50);
    vLineColor = color(255, 255, 0, 50);

    restart();
}

function draw() {
    play_round();
    let graph_payoff = total_payoff*kx;
    let graph_cooperations = graphSize - cooperations*ky;

    fill(0);
    rect(0, 0, graphSize, graphSize);
    noFill();
    stroke(hLineColor);
    line(0, graphSize/2, graphSize, graphSize/2);

    noStroke();
    fill(agentColor);
    agents.forEach(agent => {
        ellipse(agent.learn*graphSize, agent.p0*graphSize, 4, 4);
    });

    erase();
    rect(graphSize, 0, graphSize+10, graphSize);
    noErase();

    draw_stats();
    image(stats, graphSize+10, 0);

}

function restart() {
    recompute_params();
    agents = [];
    for (let i = 0; i < numAgents; i++) agents.push(new Agent());
}

function create_TFT(agent) {
    agent.learn = 1;
    agent.p0 = 0;
    agent.reset();
};

function create_cooperator(agent) {
    agent.learn = 0;
    agent.p0 = 0;
    agent.reset();
};

function create_defector(agent) {
    agent.learn = 0;
    agent.p0 = 1;
    agent.reset();
};

function create_nasty_TFT(agent) {
    agent.learn = 1;
    agent.p0 = 1;
    agent.reset();
};

function create_from_mouse(agent) {
    learn = map(mouseX, 0, graphSize, 0, 1);
    p0 = map(mouseY, 0, graphSize, 0, 1);
    if (learn >= 0 && learn <= 1 && p0 >= 0 && p0 <= 1) {
        agent.learn = learn;
        agent.p0 = p0;
        agent.reset();
    }
};

function mutate(value, amplitude, min_val, max_val) {
    return random(max(min_val, value - amplitude), min(max_val, value + amplitude));
}

class Agent {
    constructor(p0=null, learn=null) {
        this.p0 = p0 === null ? random() : p0;
        this.learn = learn === null ? random() : learn;
        this.reset();
    }

    reset() {
        this.p = this.p0;
        this.payoff = 0;
        this.avg_payoff = 0;
        this.interactions = 0;
        this.cooperations = 0;
        this.memory = new Map();
    }

    observe(other, action) {
        let p = this.memory.get(other);
        p += this.learn*(action - p);
        this.memory.set(other, p);

        this.p += this.learn*(action - this.p);
    }

    interact(other) {
        let p = this.p;
        if (this.memory.has(other)) p = this.memory.get(other);
        else this.memory.set(other, p);
        let prediction = int(random() < p);
        this.interactions++;
        if (prediction === 0) {
            this.cooperations++;
            cooperations++;
        }
        return prediction;
    }

    replace_with_child_of(other) {
        this.p0 = mutate(other.p0, 0.015, 0, 1);
        this.learn = mutate(other.learn, 0.015, 0, 1);
        this.reset();
    }

}

function play_round() {
    cooperations = 0;
    total_payoff = 0;
    for (let i = 0; i < numInteractions; i++) {
        let a = random(agents);
        let b = random(agents);
        while (a === b) b = random(agents);
        let actionA = a.interact(b);
        let actionB = b.interact(a);
        a.observe(b, actionB);
        b.observe(a, actionA);
        if (actionA === 0) {
            if (actionB === 0) {
                a.payoff += 2;
                b.payoff += 2;
                total_payoff += 4;
            }
            else {
                b.payoff += 3;
                total_payoff += 3;
            }
        }
        else {
            if (actionB === 0) {
                a.payoff += 3;
                total_payoff += 3;
            }
            else {
                a.payoff++;
                b.payoff++;
                total_payoff += 2;
            }
        }
    }

    agents.forEach(agent => agent.avg_payoff = agent.interactions ? agent.payoff/agent.interactions : 0);
    agents.sort((a, b) => b.avg_payoff - a.avg_payoff);
    for (let i = 0; i < fraction; i++) {
        good = agents[i];
        bad = agents[numAgents - i - 1];
        agents.forEach(agent => agent.memory.delete(bad));
        bad.replace_with_child_of(good);
    }

    // if key "T" is pressed, create_TFT()
    if (keyIsDown(84)) create_TFT(random(agents));
    // if key "C" is pressed, create_cooperator()
    if (keyIsDown(67)) create_cooperator(random(agents));
    // if key "D" is pressed, create_defector()
    if (keyIsDown(68)) create_defector(random(agents));
    // if key "N" is pressed, create_nasty_TFT()
    if (keyIsDown(78)) create_nasty_TFT(random(agents));
    // if mouse is pressed, create a new agent with learn and p0 given by the mouse position
    if (mouseIsPressed) create_from_mouse(random(agents));

}

function draw_stats() {
    stats.background(0);
    stats.noFill();
    stats.stroke(vLineColor);
    stats.line(graphSize/3, 0, graphSize/3, graphSize);
    stats.line(2*graphSize/3, 0, 2*graphSize/3, graphSize);
    stats.stroke(hLineColor);
    stats.line(0, graphSize/2, graphSize, graphSize/2);
    stats.noStroke();
    stats.fill(agentColor);
    agents.forEach(agent => {
        if (agent.interactions) {
            let x = agent.avg_payoff*graphSize/3;
            let y = (1 - agent.cooperations/agent.interactions)*graphSize;
            stats.ellipse(x, y, 4, 4);
        }
    });
}