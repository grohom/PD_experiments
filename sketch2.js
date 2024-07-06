const graphSize = 400;
const border1 = 20;
const border2 = 10;

let player1Color;
let player2Color;
let defectColor;
let cooperateColor;
let baseColor;
let vLineColor;
let hLineColor;
let canvas;
let graph1;
let graph2;

let learn1;
let p01;
let learn2;
let p02;

let iterations = 6;

let results1;
let results2;

let done = false;


function setup() {
  canvas = createCanvas(2*graphSize + border1, graphSize);
  canvas.parent('graph');

  player1Color = color(0, 128, 0);
  player2Color = color(0, 128, 0);
  defectColor = color(0, 200, 255, 128);
  cooperateColor = color(255, 0, 255, 128);
  baseColor = color(255, 255, 255, 128);
  vLineColor = color(255, 255, 0, 80);
  hLineColor = color(255, 255, 255, 30);

  graph1 = createGraphics(graphSize, (graphSize - border2)/2);
  graph2 = createGraphics(graphSize, (graphSize - border2)/2);

  learn1 = random();
  p01 = random();
  learn2 = random();
  p02 = random();
}

function draw() {
  let x, y;
  if (mouseIsPressed) {
    x = map(mouseX, 0, graphSize, 0, 1);
    y = map(mouseY, graphSize, 0, 0, 1);
    if (0 <= x && x <= 1 && 0 <= y && y <= 1) {
      if (keyIsDown(49)) { // if key "1" is pressed, initialize player1
        learn1 = x;
        p01 = y;
        done = false;
      }
      else if (keyIsDown(50)) { // if key "2" is pressed, initialize player2
        learn2 = x;
        p02 = y;
        done = false;
      }
    }
  }

  if (done) return;

  [results1, results2] = compute(learn1, p01, learn2, p02, iterations);

  background(0);

  noStroke();
  fill(player1Color);
  ellipse(learn1*graphSize, (1 - p01)*graphSize, 6, 6);

  noFill();
  stroke(player2Color);
  ellipse(learn2*graphSize, (1 - p02)*graphSize, 4, 4);

  noStroke();
  fill(255);
  erase();
  rect(graphSize, 0, border1, graphSize);
  rect(graphSize + border1, (graphSize - border2)/2, graphSize, border2);
  noErase();

  draw_player_graph(results1, p01, graph1);
  draw_player_graph(results2, p02, graph2);

  image(graph1, graphSize + border1, 0);
  image(graph2, graphSize + border1, (graphSize + border2)/2);

  done = true;
}


function draw_player_graph(results, p0, graph) {
  let payoffs, probs, probs_defect, probs_cooperate;
  let color_d = defectColor;
  let color_c = cooperateColor;
  let dy = 3;
  let dx_max = graphSize/2/(iterations+1);
  let dx;
  let x, y;
  let base_line = [];
  let defect_line = [];
  let cooperate_line = [];

  graph.noStroke();
  graph.fill(0);
  graph.rect(0, 0, graph.width, graph.height);

  graph.stroke(hLineColor);
  graph.noFill();
  for (let i = 0; i <= 3; i++) {
    y = map(i, 0, 3, dy, graph.height-dy);
    graph.line(0, y, graph.width, y);
  }

  results.forEach((res, iteration) => {
    [payoffs, probs, probs_defect, probs_cooperate] = res;
    x = map(iteration+1, 0, iterations+1, 0, graph.width);
    graph.stroke(hLineColor);
    graph.line(x, 0, x, graph.height);

    y = probs.map((p, i) => p*payoffs[i]).reduce((a, b) => a + b, 0);
    y = map(y, 0, 3, graph.height-dy, dy);
    base_line.push([x, y]);

    y = probs_defect.map((p, i) => p*payoffs[i]).reduce((a, b) => a + b, 0);
    y = map(y/(1-p0), 0, 3, graph.height-dy, dy);
    defect_line.push([x, y]);

    y = probs_cooperate.map((p, i) => p*payoffs[i]).reduce((a, b) => a + b, 0);
    y = map(y/p0, 0, 3, graph.height-dy, dy);
    cooperate_line.push([x, y]);

    graph.noStroke();
    payoffs.forEach((p, i) => {
      y = map(p, 0, 3, graph.height-dy, dy);
      dx = map(probs_defect[i], 0, 1, 0, dx_max);
      graph.fill(defectColor);
      graph.rect(x-dx, y-dy, dx, 2*dy);
      dx = map(probs_cooperate[i], 0, 1, 0, dx_max);
      graph.fill(cooperateColor);
      graph.rect(x, y-dy, dx, 2*dy);
    });
  });

  graph.noFill();
  graph.stroke(baseColor);
  graph.beginShape();
  base_line.forEach(xy => vertex(...xy));
  graph.endShape();
  
  graph.stroke(defectColor);
  graph.beginShape();
  defect_line.forEach(xy => vertex(...xy));
  graph.endShape();
  
  graph.stroke(cooperateColor);
  graph.beginShape();
  cooperate_line.forEach(xy => vertex(...xy));
  graph.endShape();
}



function group_by(payoffs, probs, unique_payoffs) {
  return unique_payoffs.map(payoff => 
    probs.filter((_, i) => payoffs[i] == payoff).reduce((a, b) => a + b, 0)
  );
}

function compute(learn1, p01, learn2, p02, iterations) {
  let payoff1 = 0;
  let payoff2 = 0;
  let probability = 1;

  let one_minus_learn1 = 1 - learn1;
  let one_minus_learn2 = 1 - learn2;

  let states = [[payoff1, payoff2, probability, p01, p02]];

  let p1;
  let p2;
  let probs;
  let player1_payoffs;
  let player1_unique_payoffs;
  let player1_probs;
  let player1_probs_defect;
  let player1_probs_cooperate;
  let player2_payoffs;
  let player2_unique_payoffs;
  let player2_probs;
  let player2_probs_defect;
  let player2_probs_cooperate;
  let results1 = [];
  let results2 = [];
  let new_states;
  let new_p1;
  let new_p2;
  for (let i = 1; i <= iterations; i++) {
    new_states = [];
    states.forEach(state => {
      [payoff1, payoff2, probability, p1, p2] = state;
      new_p1 = one_minus_learn1*p1;
      new_p2 = one_minus_learn2*p2;
      new_states.push([ // DEFECT, DEFECT
        payoff1 + 1,
        payoff2 + 1,
        probability*(1-p1)*(1-p2),
        new_p1,
        new_p2
      ]);
      new_states.push([ // DEFECT, COOPERATE
        payoff1 + 3,
        payoff2,
        probability*(1-p1)*p2,
        new_p1 + learn1,
        new_p2
      ]);
      new_states.push([ // COOPERATE, DEFECT
        payoff1,
        payoff2 + 3,
        probability*p1*(1-p2),
        new_p1,
        new_p2 + learn2
      ]);
      new_states.push([ // COOPERATE, COOPERATE
        payoff1 + 2,
        payoff2 + 2,
        probability*p1*p2,
        new_p1 + learn1,
        new_p2 + learn2
      ]);
    });

    states = new_states;

    probs = states.map(state => state[2]);
    player1_payoffs = states.map(state => state[0]/i);
    player2_payoffs = states.map(state => state[1]/i);

    half = Math.floor(states.length/2);
    quarter = Math.floor(half/2);
    quarter3 = 3*quarter;

    player1_unique_payoffs = [...new Set(player1_payoffs)].sort((a, b) => a - b);

    player1_probs_defect = group_by(player1_payoffs.slice(0, half), probs.slice(0, half), player1_unique_payoffs);
    player1_probs_defect.forEach(p => p/(1 - p01));

    player1_probs_cooperate = group_by(player1_payoffs.slice(half), probs.slice(half), player1_unique_payoffs);
    player1_probs_cooperate.forEach(p => p/p01);

    player1_probs = group_by(player1_payoffs, probs, player1_unique_payoffs);
    player1_payoffs = player1_unique_payoffs;

    results1.push([player1_payoffs, player1_probs, player1_probs_defect, player1_probs_cooperate]);


    player2_unique_payoffs = [...new Set(player2_payoffs)].sort((a, b) => a - b);

    player2_probs_defect = group_by(player2_payoffs.slice(0, quarter).concat(player2_payoffs.slice(half, quarter3)), probs.slice(0, quarter).concat(probs.slice(half, quarter3)), player2_unique_payoffs);
    player2_probs_defect.forEach(p => p/(1 - p02));

    player2_probs_cooperate = group_by(player2_payoffs.slice(quarter, half).concat(player2_payoffs.slice(quarter3)), probs.slice(quarter, half).concat(probs.slice(quarter3)), player2_unique_payoffs);
    player2_probs_cooperate.forEach(p => p/p02);

    player2_probs = group_by(player2_payoffs, probs, player2_unique_payoffs);
    player2_payoffs = player2_unique_payoffs;

    results2.push([player2_payoffs, player2_probs, player2_probs_defect, player2_probs_cooperate]);

  };

  return [results1, results2];

}
