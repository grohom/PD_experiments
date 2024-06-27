const graphSize = 500;
const numAgents = 50;
const numInteractions = 5000;
const killFraction = 0.33;
const fraction = Math.floor(killFraction * numAgents);

let agents = [];
let cooperations = 0;
let total_payoff = 0;

let normalColor;
let reverseColor;
let lineColor;
let line2Color;
let canvas;

function setup() {
    canvas = createCanvas(graphSize, graphSize);
    canvas.parent('graph');

    normalColor = color(0, 255, 0, 80);
    reverseColor = color(255, 100, 0, 80);
    lineColor = color(255, 255, 255, 50);
    line2Color = color(255, 255, 0, 50);

    restart();

}

function draw() {
    play_game();
    let graph_cooperations = (1 - cooperations/numInteractions/2)*graphSize;
    let graph_payoff = total_payoff/numInteractions/2/2*graphSize;

    background(0);

    stroke(lineColor);
    line(0, graph_cooperations, graphSize, graph_cooperations);

    stroke(line2Color);
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
}

document.getElementById('restart-button').addEventListener('click', restart);

function mutate(value, amplitude, min_val, max_val) {
    return random(max(min_val, value - amplitude), min(max_val, value + amplitude));
}

class Agent {
    constructor() {
        this.reverse = random() < 0.5;
        this.p0 = random();
        this.learn = random();

        this.p = this.p0;
        this.payoff = 0;
        this.avg_payoff = 0;
        this.interactions = 0;
        this.move = null;
        this.memory = new Map();
    }

    observe(other) {
        let p = this.memory.get(other);
        p += this.learn*(other.move - p);
        this.memory.set(other, p);

        this.p += this.learn*(other.move - this.p);
    }

    play(other) {
        let p = this.p;
        if (this.memory.has(other)) p = this.memory.get(other);
        else this.memory.set(other, p);
        let prediction = int(random() < p);
        this.move = this.instinct(prediction);
        this.interactions++;
        if (this.move === 0) cooperations++;
    }

    instinct(prediction) {
        if (this.reverse) return 1 - prediction;
        else return prediction;
    }

    replace_with_child_of(other) {
        this.reverse = other.reverse;
        this.p0 = mutate(other.p0, 0.015, 0, 1);
        this.learn = mutate(other.learn, 0.015, 0, 1);
        this.p = this.p0;
        this.payoff = 0;
        this.interactions = 0;
        this.memory = new Map();
        this.move = null;
    }

}

function play_game() {
    agents.forEach(agent => agent.avg_payoff = agent.interactions ? agent.payoff/agent.interactions : 0);
    agents.sort((a, b) => b.avg_payoff - a.avg_payoff);
    for (let ia = 0; ia < fraction; ia++) {
        good = agents[ia];
        bad = agents[numAgents - ia - 1];
        agents.forEach(agent => agent.memory.delete(bad));
        bad.replace_with_child_of(good);
    }
    cooperations = 0;
    total_payoff = 0;
    for (let i = 0; i < numInteractions; i++) {
        let a = random(agents);
        let b = random(agents);
        while (a === b) b = random(agents);
        a.play(b);
        b.play(a);
        a.observe(b);
        b.observe(a);
        if (a.move === 0) {
            if (b.move === 0) {
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
            if (b.move === 0) {
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
