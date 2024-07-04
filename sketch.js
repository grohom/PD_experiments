const graphSize = 400;
const borderSize = 20;
const kxs = graphSize/3;
const beta = 0.1;

let agents = [];
let changed_params = true;
let population_mean_payoff;
let max_age;

let numAgents;
let numInteractions;
let deathProb;
let learn_min;
let learn_max;
let p0_min;
let p0_max;

let agentColor;
let markedAgentColor;
let statsColor;
let markedStatsColor;
let vLineColor;
let hLineColor;
let canvas;
let stats;

const numAgentsSlider = document.getElementById('num-agents');
const numInteractionsSlider = document.getElementById('num-interactions');
const deathProbSlider = document.getElementById('kill-fraction');
const restartButton = document.getElementById('restart-button');
const seed = document.getElementById('random-seed');
const randomizeSeed = document.getElementById('randomize-seed');
const learnMin = document.getElementById('learn-min');
const learnMax = document.getElementById('learn-max');
const p0Min = document.getElementById('p0-min');
const p0Max = document.getElementById('p0-max');
const nAgentsText = [...document.getElementsByClassName('nagents-text')];
const nInteractionsText = [...document.getElementsByClassName('ninteractions-text')];
const fractionText = [...document.getElementsByClassName('fraction-text')];

restartButton.addEventListener('click', restart);
numAgentsSlider.addEventListener('input', () => nAgentsText.forEach(t => t.innerHTML = numAgentsSlider.value));
numInteractionsSlider.addEventListener('input', () => {nInteractionsText.forEach(t => t.innerHTML = numInteractionsSlider.value); changed_params = true});
deathProbSlider.addEventListener('input', () => {fractionText.forEach(t => t.innerHTML = float(deathProbSlider.value*100).toFixed(1)); changed_params = true});
seed.addEventListener('input', () => randomizeSeed.checked = false);

// https://stackoverflow.com/a/25984542/295155
var rnd = Math.random;
function shffle(a,b,c,d){c=a.length;while(c)b=rnd()*c--|0,d=a[c],a[c]=a[b],a[b]=d}

function recompute_params() {
    numInteractions = int(numInteractionsSlider.value);
    deathProb = float(deathProbSlider.value);
    changed_params = false;
}

function setup() {
    canvas = createCanvas(2*graphSize+borderSize, graphSize);
    canvas.parent('graph');

    stats = createGraphics(graphSize, graphSize);

    agentColor = color(0, 255, 0, 80);
    markedAgentColor = color(255, 128, 0, 100);
    statsColor = color(0, 200, 255, 80);
    markedStatsColor = color(255, 0, 255, 100);
    vLineColor = color(255, 255, 0, 80);
    hLineColor = color(255, 255, 255, 30);

    restart();
}

function draw() {
    if (changed_params) recompute_params();

    play_round();

    fill(0);
    rect(0, 0, graphSize, graphSize);

    noFill();
    stroke(hLineColor);
    line(0, graphSize/2, graphSize, graphSize/2);

    noStroke();
    agents.forEach(agent => {
        let _color = agent.marked ? markedAgentColor : agentColor;
        _color.setAlpha(map(agent.age, 0, max_age, 40, 128));
        fill(_color);
        ellipse(agent.learn*graphSize, agent.p0*graphSize, 4, 4);
    });

    erase();
    rect(graphSize, 0, graphSize+borderSize, graphSize);
    noErase();

    draw_stats();
    image(stats, graphSize+borderSize, 0);

}

function draw_stats() {
    stats.background(0);
    stats.noFill();
    stats.stroke(hLineColor);
    stats.line(graphSize/3, 0, graphSize/3, graphSize);
    stats.line(2*graphSize/3, 0, 2*graphSize/3, graphSize);
    stats.line(2*graphSize/3, 0, graphSize/3, graphSize);
    stats.line(0, graphSize/2, graphSize, graphSize/2);
    stats.stroke(vLineColor);
    stats.line(graphSize*population_mean_payoff/3, 0, graphSize*population_mean_payoff/3, graphSize);
    stats.noStroke();
    agents.forEach(agent => {
        if (agent.interactions) {
            let _color = agent.marked ? markedStatsColor : statsColor;
            _color.setAlpha(map(agent.age, 0, max_age, 40, 128));
            stats.fill(_color);
            let x = agent.fitness*kxs;
            let y = (1 - agent.cooperations/agent.interactions)*graphSize;
            stats.ellipse(x, y, 4, 4);
        }
    });
}

function restart() {
    if (randomizeSeed.checked) {
        seed.value = int(rnd()*1000000000);
    }
    randomSeed(int(seed.value));
    learn_min = float(learnMin.value);
    learn_max = float(learnMax.value);
    p0_min = 1 - float(p0Min.value);
    p0_max = 1 - float(p0Max.value);
    numAgents = int(numAgentsSlider.value);
    agents = [];
    for (let i = 0; i < numAgents; i++) agents.push(new Agent());
}

function create_TFT(agent) {
    agent.learn = 1;
    agent.p0 = 0;
    agent.reset();
    agent.marked = true;
};

function create_cooperator(agent) {
    agent.learn = 0;
    agent.p0 = 0;
    agent.reset();
    agent.marked = true;
};

function create_defector(agent) {
    agent.learn = 0;
    agent.p0 = 1;
    agent.reset();
    agent.marked = true;
};

function create_nasty_TFT(agent) {
    agent.learn = 1;
    agent.p0 = 1;
    agent.reset();
    agent.marked = true;
};

function create_from_mouse(agent) {
    learn = map(mouseX, 0, graphSize, 0, 1);
    p0 = map(mouseY, 0, graphSize, 0, 1);
    if (learn >= 0 && learn <= 1 && p0 >= 0 && p0 <= 1) {
        agent.learn = learn;
        agent.p0 = p0;
        agent.reset();
        agent.marked = true;
    }
};

function mutate(value, amplitude, min_val, max_val) {
    return random(max(min_val, value - amplitude), min(max_val, value + amplitude));
}

class Agent {
    constructor(p0=null, learn=null) {
        this.marked = false;
        this.p0 = p0 === null ? random(p0_min, p0_max) : p0;
        this.learn = learn === null ? random(learn_min, learn_max) : learn;
        this.reset();
    }

    reset() {
        this.age = 0;
        this.p = this.p0;
        this.payoff = 0;
        this.fitness = null;
        this.interactions = 0;
        this.cooperations = 0;
        this.memory = new Map();
    }

    observe(other, action) {
        let p = this.memory.get(other);
        p += this.learn*(action - p);
        this.memory.set(other, p);

        // this.p = this.memory.values().reduce((a, b) => a + b, 0)/this.memory.size;
    }

    interact(other) {
        let p = this.p;
        if (this.memory.has(other)) p = this.memory.get(other);
        else this.memory.set(other, p);
        let prediction = int(rnd() < p);
        this.interactions++;
        if (prediction === 0) {
            this.cooperations++;
        }
        return prediction;
    }

    replace_with_child_of(other) {
        this.marked = other.marked;
        this.p0 = mutate(other.p0, 0.015, 0, 1);
        this.learn = mutate(other.learn, 0.015, 0, 1);
        this.reset();
    }

    update_fitness() {
        // if (this.fitness === null) this.fitness = this.payoff;
        // else this.fitness += beta*(this.payoff/this.interactions - this.fitness);
        this.fitness = this.payoff/this.interactions;
    }

}

function play_round() {

    for (let i = 0; i < numInteractions; i++) {
        agents.forEach(agent => agent.age++);

        let a = random(agents);
        let b = random(agents);
        while (a === b) b = random(agents);

        if (rnd() > deathProb) {
            // play
            let actionA = a.interact(b);
            let actionB = b.interact(a);
            a.observe(b, actionB);
            b.observe(a, actionA);
            if (actionA === 0) {
                if (actionB === 0) {
                    a.payoff += 2;
                    b.payoff += 2;
                }
                else {
                    b.payoff += 3;
                }
            }
            else {
                if (actionB === 0) {
                    a.payoff += 3;
                }
                else {
                    a.payoff++;
                    b.payoff++;
                }
            }
            a.update_fitness();
            b.update_fitness();
        }
        else {
            // fight
            if ((a.fitness ?? 1.5) < (b.fitness ?? 1.5)) {
                let temp = a;
                a = b;
                b = temp;
            }
            agents.forEach(agent => agent.memory.delete(b));
            b.replace_with_child_of(a);
        }
    }

    // if key "R" is pressed, restart()
    if (keyIsDown(82)) restart();
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

    population_mean_payoff = agents.reduce((sum, agent) => sum + agent.fitness, 0)/agents.length;
    max_age = max(agents.map(agent => agent.age));

}
