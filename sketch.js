const numAgents = 100;
const numInteractions = 5000;
const killFraction = 1/3;
const graphSize = 500;
const fraction = Math.floor(killFraction * numAgents);
const kx = graphSize/numInteractions/2/2;
const ky = graphSize/numInteractions/2;

let agents = [];
let cooperations = 0;
let total_payoff = 0;

let normalColor;
let reverseColor;
let hLineColor;
let vLineColor;
let canvas;

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
    agents = [];
    for (let i = 0; i < numAgents; i++) agents.push(new Agent());
    // Nice Tit For Tat
    agents[0].immortal = true;
    agents[0].reverse = false;
    agents[0].learn = 1;
    agents[0].p0 = 0;
    // Cooperator
    agents[1].immortal = true;
    agents[1].reverse = false;
    agents[1].learn = 0;
    agents[1].p0 = 0;
    // Defector
    agents[2].immortal = true;
    agents[2].reverse = false;
    agents[2].learn = 0;
    agents[2].p0 = 1;
    // Nasty Tit For Tat
    agents[3].immortal = true;
    agents[3].reverse = false;
    agents[3].learn = 1;
    agents[3].p0 = 1;
}

document.getElementById('restart-button').addEventListener('click', restart);

function mutate(value, amplitude, min_val, max_val) {
    return random(max(min_val, value - amplitude), min(max_val, value + amplitude));
}

class Agent {
    constructor(reverse=null, p0=null, learn=null) {
        this.immortal = false;
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
        if (good.immortal) continue;
        bad = agents[numAgents - i - 1];
        if (bad.immortal) continue;
        agents.forEach(agent => agent.memory.delete(bad));
        bad.replace_with_child_of(good);
    }
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
