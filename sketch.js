/*
  p5.js Quiz System
  - Reads questions from questions.csv (header: question, optionA, optionB, optionC, optionD, answer)
  - Presents 5 questions
  - Tracks score and shows different animations based on performance
  - Custom cursor effects and option selection effects

  Put questions.csv in the same folder as this sketch.
*/

let table;
let questions = [];
let current = 0;
let score = 0;
let selected = null;
let state = 'loading'; // 'loading', 'quiz', 'result'
let optionRects = [];
let cursorTrail = [];
let particles = [];
let confetti = [];
let cursorPink;
let hoverOption = false;
let cursorGold;
let clouds = [];
let darkClouds = [];
let resultPerfect = false;
let showSun = false;
let cloudFade = 1.0; // 1 visible, 0 hidden
let cloudFadeTarget = 1.0;

function preload() {
  // load CSV with header
  // if local file access is blocked in some browsers, open via a local server
  table = loadTable('questions.csv', 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Arial');
  noCursor();
  cursorPink = color(255, 105, 180);
  cursorGold = color(255, 215, 0);

  // create background clouds
  // create clouds already spread across the canvas so they gently drift left->right
  for (let i = 0; i < 24; i++) {
    clouds.push(new Cloud(random(-100, width + 100), random(height * 0.02, height * 0.6), random(0.8, 1.4)));
  }
  if (table && table.getRowCount() > 0) {
    for (let r = 0; r < table.getRowCount(); r++) {
      let row = table.getRow(r);
      questions.push({
        q: row.get('question'),
        options: [row.get('optionA'), row.get('optionB'), row.get('optionC'), row.get('optionD')],
        answer: row.get('answer') // 'A'..'D'
      });
    }
  }
  if (questions.length === 0) {
    // fallback simple questions if CSV missing
    questions = [
      { q: '2+2=?', options: ['3','4','5','6'], answer: 'B' },
      { q: '5-3=?', options: ['1','3','2','4'], answer: 'C' },
      { q: '3*3=?', options: ['6','9','8','7'], answer: 'B' },
      { q: '10/2=?', options: ['3','4','5','2'], answer: 'C' },
      { q: '1+1=?', options: ['1','3','2','4'], answer: 'C' }
    ];
  }

  // limit to first 7
  questions = questions.slice(0, 7);
  state = 'quiz';
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  backgroundGradient();

  // background clouds
  // gently approach target fade (used when result changes)
  cloudFade = lerp(cloudFade, cloudFadeTarget, 0.02);
  for (let i = 0; i < clouds.length; i++) {
    clouds[i].update();
    clouds[i].draw();
  }
  // dark clouds (visible only after bad result)
  for (let i = 0; i < darkClouds.length; i++) {
    darkClouds[i].update();
    darkClouds[i].draw();
  }

  // update and draw cursor trail
  cursorTrail.push({ x: mouseX, y: mouseY, t: millis() });
  // allow longer trail while dragging
  let maxTrail = mouseIsPressed ? 40 : 20;
  while (cursorTrail.length > maxTrail) cursorTrail.shift();
  drawCursorTrail();

  if (state === 'quiz') {
    drawQuestion();
  } else if (state === 'result') {
    drawResult();
  } else {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(24);
    text('Loading...', width / 2, height / 2);
  }

  // update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].isDead()) particles.splice(i, 1);
  }

  for (let i = confetti.length - 1; i >= 0; i--) {
    confetti[i].update();
    confetti[i].draw();
    if (confetti[i].off()) confetti.splice(i, 1);
  }

  // draw big cursor (pink), emphasize when hovering options
  push();
  noFill();
  if (hoverOption) {
    stroke(red(cursorPink), green(cursorPink), blue(cursorPink), 255);
    strokeWeight(3.8);
    ellipse(mouseX, mouseY, 40, 40);
    noStroke();
    fill(cursorPink);
    ellipse(mouseX, mouseY, 10, 10);
  } else {
    stroke(red(cursorPink), green(cursorPink), blue(cursorPink), 180);
    strokeWeight(2.2);
    ellipse(mouseX, mouseY, 26, 26);
  }
  pop();
}

function drawQuestion() {
  let margin = 40;
  let qareaW = min(width - margin * 2, 900);
  let qx = (width - qareaW) / 2;
  let qy = 80;

  // question box
  fill(255, 240);
  noStroke();
  rect(qx, qy, qareaW, 120, 12);

  fill(20);
  textSize(22);
  textAlign(LEFT, TOP);
  text('題目 ' + (current + 1) + '/' + questions.length, qx + 20, qy + 12);
  textSize(20);
  text(questions[current].q, qx + 20, qy + 40, qareaW - 40, 120);

  // options
  optionRects = [];
  let optY = qy + 150;
  let ow = qareaW;
  let oh = 60;
  // reset hover flag for cursor emphasis
  hoverOption = false;
  for (let i = 0; i < 4; i++) {
    let ox = qx;
    let oy = optY + i * (oh + 14);

    // hover detection
    let hovered = (mouseX > ox && mouseX < ox + ow && mouseY > oy && mouseY < oy + oh);
    if (hovered) hoverOption = true;

    push();
    if (selected === i) {
      // selected effect (pink)
      fill(255, 155, 210, 230);
      stroke(220, 70, 150);
      strokeWeight(2);
      rect(ox, oy, ow, oh, 10);
      fill(30);
    } else if (hovered) {
      // hover effect more pronounced in pink
      fill(255, 230, 245);
      stroke(255, 105, 180);
      strokeWeight(2.2);
      rect(ox, oy, ow, oh, 10);
      fill(20);
    } else {
      fill(255, 240);
      noStroke();
      rect(ox, oy, ow, oh, 10);
      fill(10);
    }
    pop();

    textSize(18);
    textAlign(LEFT, CENTER);
    let label = String.fromCharCode(65 + i) + '. ' + questions[current].options[i];
    text(label, ox + 16, oy + oh / 2);

    optionRects.push({ x: ox, y: oy, w: ow, h: oh });
  }

  // Next / Submit button
  let btnW = 160, btnH = 48;
  let bx = width / 2 - btnW / 2;
  let by = optY + 4 * (oh + 14) + 24;
  let ready = (selected !== null);
  push();
  if (mouseX > bx && mouseX < bx + btnW && mouseY > by && mouseY < by + btnH) {
    fill(30, 160, 240);
  } else {
    fill(40, 120, 200);
  }
  if (!ready) fill(160);
  noStroke();
  rect(bx, by, btnW, btnH, 10);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(18);
  text( current < questions.length - 1 ? '下一題' : '提交成績', bx + btnW / 2, by + btnH / 2);
  pop();

  // hint
  if (!ready) {
    fill(255, 200);
    textSize(14);
    textAlign(CENTER);
    text('請先選擇一個選項', width / 2, by + btnH + 18);
  }
}

function mousePressed() {
  if (state === 'quiz') {
    // check options
    for (let i = 0; i < optionRects.length; i++) {
      let r = optionRects[i];
      if (mouseX > r.x && mouseX < r.x + r.w && mouseY > r.y && mouseY < r.y + r.h) {
        selected = i;
        // particle burst at click
        for (let k = 0; k < 18; k++) particles.push(new Particle(mouseX, mouseY));
        return;
      }
    }

    // check next/submit button
    let qareaW = min(width - 40 * 2, 900);
    let btnW = 160, btnH = 48;
    let bx = width / 2 - btnW / 2;
    let optY = 80 + 150;
    let by = optY + 4 * (60 + 14) + 24;
    if (mouseX > bx && mouseX < bx + btnW && mouseY > by && mouseY < by + btnH) {
      if (selected === null) return;
      // evaluate
      let correctChar = questions[current].answer.trim().toUpperCase();
      let chosenChar = String.fromCharCode(65 + selected);
      if (chosenChar === correctChar) {
        score++;
        // nice particle color for correct
        for (let k = 0; k < 28; k++) particles.push(new Particle(random(width/2-60,width/2+60), by + btnH/2, color(80,220,120)));
      } else {
        for (let k = 0; k < 18; k++) particles.push(new Particle(mouseX, mouseY, color(240,100,100)));
      }
      selected = null;
      current++;
      if (current >= questions.length) {
        state = 'result';
        startResultAnimation();
      }
    }
  } else if (state === 'result') {
    // restart on click
    resetQuiz();
  }
}

function resetQuiz() {
  current = 0; score = 0; selected = null; state = 'quiz';
  // clear transient effects
  confetti = [];
  particles = [];
  // clear dark clouds and result flags so background returns to blue sky + white clouds
  darkClouds = [];
  resultPerfect = false;
  showSun = false;
  cloudFadeTarget = 1.0; // ensure clouds fade back in

  // reposition and slightly refresh cloud parts so the sky looks refreshed
  for (let i = 0; i < clouds.length; i++) {
    let c = clouds[i];
    c.x = random(-100, width + 100);
    c.y = random(height * 0.02, height * 0.6);
    // regenerate parts for visual variety (keeps them white)
    c.parts = [];
    for (let j = 0; j < c.detail; j++) {
      let ox = (j - (c.detail - 1) / 2) * (c.w * 0.08) + random(-6, 6);
      let oy = random(-4, 4);
      let ww = c.w * (0.6 + random(0, 0.6));
      let hh = c.h * (0.6 + random(0, 0.6));
      let a = c.opacity * (0.7 + random(0, 0.6));
      c.parts.push({ ox, oy, ww, hh, a });
    }
  }
}

function startResultAnimation() {
  resultPerfect = (score === questions.length);
  if (resultPerfect) {
    // perfect: sun & lots of confetti, fade clouds
    showSun = true;
    cloudFadeTarget = 0.12;
    for (let i = 0; i < 320; i++) confetti.push(new Confetto(random(width), random(-300, -10)));
  } else {
    showSun = false;
    cloudFadeTarget = 1.0;
    if (score >= 4) {
      for (let i = 0; i < 220; i++) confetti.push(new Confetto(random(width), random(-200, -10)));
    } else if (score >= 2) {
      // gentle bubbles
      for (let i = 0; i < 40; i++) particles.push(new Particle(random(width), height + random(0,200), color(150,200,255), -1));
    } else {
      // spawn darker storm clouds
      darkClouds = [];
      for (let i = 0; i < 8; i++) darkClouds.push(new CloudDark(random(-200, width), random(height * 0.05, height * 0.5), random(0.8, 1.6)));
      // some heavier confetti-like drops to simulate messy rain-like bits
      for (let i = 0; i < 80; i++) confetti.push(new Confetto(random(width), random(-400, height)));
    }
  }
}

function drawResult() {
  // overlay depending on result
  if (!resultPerfect) {
    // slightly darken for non-perfect
    fill(0, 90);
    rect(0, 0, width, height);
  } else {
    // subtle brightening for perfect
    fill(255, 20);
    rect(0, 0, width, height);
  }

  // larger, centered result texts
  textAlign(CENTER, CENTER);
  textSize(56);
  fill(255);
  text('測驗完畢', width / 2, height / 2 - 90);

  textSize(48);
  fill(255, 240, 200);
  text('得分：' + score + ' / ' + questions.length, width / 2, height / 2 - 20);

  textSize(36);
  if (score >= 4) {
    fill(255, 230, 200);
    text('太棒了！你表現非常好！', width / 2, height / 2 + 40);
  } else if (score >= 2) {
    fill(255, 240);
    text('很不錯，繼續加油！', width / 2, height / 2 + 40);
  } else {
    fill(255, 240);
    text('別灰心，多練習就會更好！', width / 2, height / 2 + 40);
  }

  textSize(20);
  fill(220);
  text('點擊畫面重新開始', width / 2, height - 60);
}

function backgroundGradient() {
  // sky gradient: change tone if perfect result shows sun or if dark clouds present
  if (resultPerfect && showSun) {
    // bright morning sky
    for (let y = 0; y < height; y++) {
      let t = map(y, 0, height, 0, 1);
      let c = lerpColor(color(180, 220, 255), color(100, 180, 255), t);
      stroke(c);
      line(0, y, width, y);
    }
    // draw sun
    push();
    noStroke();
    let sx = width * 0.85; let sy = height * 0.18;
    for (let r = 80; r > 0; r -= 12) {
      fill(255, 230, 150, map(r, 80, 0, 30, 180));
      ellipse(sx, sy, r * 3, r * 3);
    }
    pop();
  } else if (!resultPerfect && darkClouds.length > 0) {
    // stormy sky
    for (let y = 0; y < height; y++) {
      let t = map(y, 0, height, 0, 1);
      let top = lerpColor(color(80, 90, 110), color(50, 60, 75), t * 0.9);
      stroke(top);
      line(0, y, width, y);
    }
  } else {
    // default calm sky gradient (sky-blue)
    for (let y = 0; y < height; y++) {
      let t = map(y, 0, height, 0, 1);
      let c = lerpColor(color(180, 220, 255), color(100, 180, 255), t);
      stroke(c);
      line(0, y, width, y);
    }
  }
}

function drawCursorTrail() {
  noStroke();
  for (let i = 0; i < cursorTrail.length; i++) {
    let p = cursorTrail[i];
    let age = millis() - p.t;
    let a = map(age, 0, 600, 200, 0);
    // gold when dragging, otherwise soft white
    if (mouseIsPressed) fill(red(cursorGold), green(cursorGold), blue(cursorGold), a);
    else fill(255, a);
    let s = map(i, 0, cursorTrail.length, 2, mouseIsPressed ? 20 : 12);
    ellipse(p.x, p.y, s, s);
  }
}

function mouseDragged() {
  // spawn gold particles while dragging
  for (let k = 0; k < 2; k++) {
    particles.push(new Particle(mouseX + random(-8,8), mouseY + random(-8,8), cursorGold));
  }
}

// Cloud background
class Cloud {
  constructor(x, y, scale = 1) {
    this.x = x; this.y = y; this.scale = scale;
    // ensure slow positive left->right drift
    this.speed = random(0.12, 0.4) * (0.5 + scale * 0.5);
    if (this.speed < 0.06) this.speed = 0.06;
    this.w = 120 * this.scale; this.h = 60 * this.scale;
    this.opacity = random(50, 140);
    this.detail = floor(random(3,6));
    // precompute part offsets/sizes/alpha to avoid per-frame jitter
    this.parts = [];
    for (let i = 0; i < this.detail; i++) {
      // deterministic offsets/sizes per cloud instance
      let ox = (i - (this.detail - 1) / 2) * (this.w * 0.08) + random(-6, 6);
      let oy = random(-4, 4);
      let ww = this.w * (0.6 + random(0, 0.6));
      let hh = this.h * (0.6 + random(0, 0.6));
      let a = this.opacity * (0.7 + random(0, 0.6));
      this.parts.push({ ox, oy, ww, hh, a });
    }
  }
  update() {
    this.x += this.speed;
    if (this.x - this.w > width) this.x = -this.w - random(20, 200);
  }
  draw() {
    push();
    noStroke();
    // layered ellipses for fluffy look (precomputed parts to avoid jitter)
    for (let i = 0; i < this.parts.length; i++) {
      let p = this.parts[i];
      fill(255, p.a * cloudFade);
      ellipse(this.x + p.ox, this.y + p.oy, p.ww, p.hh);
    }
    pop();
  }
}

// Dark storm cloud
class CloudDark {
  constructor(x, y, scale = 1) {
    this.x = x; this.y = y; this.scale = scale;
    // slower dark cloud drift (also left->right)
    this.speed = random(0.08, 0.28) * (0.6 + scale * 0.4);
    if (this.speed < 0.04) this.speed = 0.04;
    this.w = 220 * this.scale; this.h = 90 * this.scale;
    this.opacity = random(140, 200);
  }
  update() {
    this.x += this.speed;
    if (this.x - this.w > width) this.x = -this.w - random(20, 200);
  }
  draw() {
    push();
    noStroke();
    // heavier, layered darker shapes
    fill(40, 40, 50, this.opacity);
    ellipse(this.x, this.y, this.w, this.h);
    fill(30, 30, 36, this.opacity - 30);
    ellipse(this.x - this.w * 0.3, this.y + this.h * 0.05, this.w * 0.8, this.h * 0.8);
    ellipse(this.x + this.w * 0.28, this.y + this.h * 0.02, this.w * 0.9, this.h * 0.85);
    pop();
  }
}

// Particle for bursts
class Particle {
  constructor(x, y, col = color(255, 200, 80), dir = 1) {
    this.pos = createVector(x, y);
    let a = random(TWO_PI);
    let m = random(1, 6);
    this.vel = createVector(cos(a) * m * dir, sin(a) * m * dir - random(1,3));
    this.acc = createVector(0, 0.12);
    this.l = random(6, 14);
    this.c = col;
    this.life = 2000; this.birth = millis();
  }
  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
  }
  draw() {
    push();
    noStroke();
    let a = map(millis() - this.birth, 0, this.life, 255, 0);
    fill(red(this.c), green(this.c), blue(this.c), a);
    ellipse(this.pos.x, this.pos.y, this.l);
    pop();
  }
  isDead() { return millis() - this.birth > this.life; }
}

class Confetto {
  constructor(x, y) {
    this.x = x; this.y = y; this.vx = random(-1, 1); this.vy = random(1, 4);
    this.w = random(6, 12); this.h = random(8, 14);
    this.c = color(random(50,255), random(50,255), random(50,255));
    this.rot = random(TWO_PI); this.rotSpeed = random(-0.1, 0.1);
  }
  update() {
    this.x += this.vx; this.y += this.vy; this.rot += this.rotSpeed;
    this.vx += sin(frameCount * 0.01) * 0.01;
  }
  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.rot);
    noStroke(); fill(this.c);
    rectMode(CENTER);
    rect(0, 0, this.w, this.h);
    pop();
  }
  off() { return this.y > height + 50; }
}
