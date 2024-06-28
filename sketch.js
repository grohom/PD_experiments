const graphSize = 500;
let numAgents;
let numInteractions;
let killFraction;
let fraction;
let kx;
let ky;

let agents = [];
let cooperations = 0;
let total_payoff = 0;

let normalColor;
let reverseColor;
let hLineColor;
let vLineColor;
let canvas;

const numAgentsSlider = document.getElementById('num-agents');
const numInteractionsSlider = document.getElementById('num-interactions');
const killFractionSlider = document.getElementById('kill-fraction');
const restartButton = document.getElementById('restart-button');
const nAgentsText = [...document.getElementsByClassName('nagents_text')];
const nInteractionsText = [...document.getElementsByClassName('ninteractions_text')];
const fractionText = [...document.getElementsByClassName('fraction_text')];

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
    canvas = createCanvas(graphSize, graphSize);
    canvas.parent('graph');

    normalColor = color(0, 255, 0, 80);
    reverseColor = color(255, 100, 0, 80);
    hLineColor = color(255, 255, 255, 50);
    vLineColor = color(255, 255, 0, 50);

    restart();

}

function draw() {
    play_round();
    let graph_payoff = total_payoff*kx;
    let graph_cooperations = graphSize - cooperations*ky;

    background(0);

    stroke(hLineColor);
    line(0, graph_cooperations, graphSize, graph_cooperations);

    stroke(vLineColor);
    line(graph_payoff, 0, graph_payoff, graphSize);

    noStroke();
    agents.forEach(agent => {
        fill(agent.reverse ? reverseColor : normalColor);
        ellipse(agent.learn*graphSize, agent.p0*graphSize, 4, 4);
    });

}

function restart() {
    recompute_params();
    agents = [];
    for (let i = 0; i < numAgents; i++) agents.push(new Agent());
}

function create_TFT(agent) {
    agent.reverse = false;
    agent.learn = 1;
    agent.p0 = 0;
    agent.reset();
};

function create_cooperator(agent) {
    agent.reverse = false;
    agent.learn = 0;
    agent.p0 = 0;
    agent.reset();
};

function create_defector(agent) {
    agent.reverse = false;
    agent.learn = 0;
    agent.p0 = 1;
    agent.reset();
};

function create_nasty_TFT(agent) {
    agent.reverse = false;
    agent.learn = 1;
    agent.p0 = 1;
    agent.reset();
};

function create_from_mouse(agent) {
    // agent.reverse = false;
    agent.learn = map(mouseX, 0, width, 0, 1);
    agent.p0 = map(mouseY, 0, height, 0, 1);
    agent.reset();
};

function mutate(value, amplitude, min_val, max_val) {
    return random(max(min_val, value - amplitude), min(max_val, value + amplitude));
}

class Agent {
    constructor(reverse=null, p0=null, learn=null) {
        this.reverse = reverse === null ? random() < 0.5 : reverse;
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
        let action = this.instinct(prediction);
        this.interactions++;
        if (action === 0) {
            this.cooperations++;
            cooperations++;
        }
        return action;
    }

    instinct(prediction) {
        if (this.reverse) return 1 - prediction;
        else return prediction;
    }

    replace_with_child_of(other) {
        this.reverse = other.reverse;
        this.p0 = mutate(other.p0, 0.015, 0, 1);
        this.learn = mutate(other.learn, 0.015, 0, 1);
        this.reset();
    }

}

function play_round() {
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
}
