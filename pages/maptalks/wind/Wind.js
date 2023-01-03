var VELOCITY_SCALE = 0.005 * (Math.pow(window.devicePixelRatio, 1 / 3) || 1); // scale for wind velocity (completely arbitrary--this value looks nice)
var PARTICLE_MULTIPLIER = 1 / 300;
var MAX_PARTICLE_AGE = 50;
var NULL_WIND_VECTOR = [NaN, NaN, null];
var PARTICLE_LINE_WIDTH = 2;

var FRAME_RATE = 30;
var FRAME_TIME = 1000 / FRAME_RATE; // desired frames per second

function isValue(x) {
  return x !== null && x !== undefined;
}
function mercY(lat) {
  return Math.log(Math.tan(lat / 2 + Math.PI / 4));
}
function deg2rad(deg) {
  return (deg / 180) * Math.PI;
}
function rad2deg(ang) {
  return ang / (Math.PI / 180.0);
}
function floorMod(a, n) {
  return a - n * Math.floor(a / n);
}

function project(lat, lon, windy) {
  // both in radians, use deg2rad if neccessary
  var ymin = mercY(windy.south);
  var ymax = mercY(windy.north);
  var xFactor = windy.width / (windy.east - windy.west);
  var yFactor = windy.height / (ymax - ymin);

  var y = mercY(deg2rad(lat));
  var x = (deg2rad(lon) - windy.west) * xFactor;
  var y = (ymax - y) * yFactor; // y points south
  return [x, y];
}

function distortion(projection, λ, φ, x, y, windy) {
  var τ = 2 * Math.PI;
  var H = Math.pow(10, -5.2);
  var hλ = λ < 0 ? H : -H;
  var hφ = φ < 0 ? H : -H;

  var pλ = project(φ, λ + hλ, windy);
  var pφ = project(φ + hφ, λ, windy);

  // Meridian scale factor (see Snyder, equation 4-3), where R = 1. This handles issue where length of 1º λ
  // changes depending on φ. Without this, there is a pinching effect at the poles.
  var k = Math.cos((φ / 360) * τ);
  return [(pλ[0] - x) / hλ / k, (pλ[1] - y) / hλ / k, (pφ[0] - x) / hφ, (pφ[1] - y) / hφ];
}

function toto(grid, λ, φ, header, builder) {
  var λ0 = header.lo1;
  var Δλ = header.dx;
  var φ0 = header.la1;
  var Δφ = header.dy;
  var i = floorMod(λ - λ0, 360) / Δλ; // calculate longitude index in wrapped range [0, 360)
  var j = (φ0 - φ) / Δφ; // calculate latitude index in direction +90 to -90

  var fi = Math.floor(i),
    ci = fi + 1;
  var fj = Math.floor(j),
    cj = fj + 1;

  var row;
  if ((row = grid[fj])) {
    var g00 = row[fi];
    var g10 = row[ci];
    if (isValue(g00) && isValue(g10) && (row = grid[cj])) {
      var g01 = row[fi];
      var g11 = row[ci];
      if (isValue(g01) && isValue(g11)) {
        // All four points found, so interpolate the value.
        return builder.interpolate(i - fi, j - fj, g00, g10, g01, g11);
      }
    }
  }
  return null;
}

function bilinearInterpolateVector(x, y, g00, g10, g01, g11) {
  var rx = 1 - x;
  var ry = 1 - y;
  var a = rx * ry,
    b = x * ry,
    c = rx * y,
    d = x * y;
  var u = g00[0] * a + g10[0] * b + g01[0] * c + g11[0] * d;
  var v = g00[1] * a + g10[1] * b + g01[1] * c + g11[1] * d;
  return [u, v, Math.sqrt(u * u + v * v)];
}

// 将数组合并为，创建一条风数据对象
function createWindItem(data) {
  var uComp = data[0];
  var vComp = data[1];
  return {
    header: uComp.header,
    data: function (i) {
      return [uComp.data[i], vComp.data[i]];
    },
    interpolate: bilinearInterpolateVector
  };
}

function createField(columns, bounds, colors) {
  /**
   * @returns {Array} wind vector [u, v, magnitude] at the point (x, y), or [NaN, NaN, null] if wind
   *          is undefined at that point.
   */
  function field(x, y) {
    var column = columns[Math.round(x)];
    return (column && column[Math.round(y)]) || NULL_WIND_VECTOR;
  }

  // Frees the massive "columns" array for GC. Without this, the array is leaked (in Chrome) each time a new
  // field is interpolated because the field closure's context is leaked, for reasons that defy explanation.
  field.release = function () {
    columns = [];
  };

  field.randomize = function (o) {
    // UNDONE: this method is terrible
    var x, y;
    var safetyNet = 0;
    do {
      x = Math.round(Math.floor(Math.random() * bounds.width) + bounds.x);
      y = Math.round(Math.floor(Math.random() * bounds.height) + bounds.y);
    } while (field(x, y)[2] === null && safetyNet++ < 30);

    o.x = x;
    o.y = y;

    o.color = searchColor(colors, field(x, y)[2]);
    return o;
  };

  return field;
}

function animate(ctx, bounds, field, extent) {
  var animationLoop;
  var mapArea = (extent.south - extent.north) * (extent.west - extent.east);
  var adj = Math.pow(mapArea, 0.2);
  var particleCount = Math.round(bounds.width * bounds.height * PARTICLE_MULTIPLIER * adj);
  // particleCount = 1000
  var colorGroup = {};
  var particles = [];
  for (var i = 0; i < particleCount; i++) {
    const one = field.randomize({
      age: Math.floor(Math.random() * MAX_PARTICLE_AGE) + 0
    });
    particles.push(one);
  }

  const value = particles.map(c => c.color);

  function evolve() {
    colorGroup = {};
    particles.forEach(function (particle) {
      if (particle.age > MAX_PARTICLE_AGE) {
        field.randomize(particle);
        particle.age = 0;
      }
      var x = particle.x;
      var y = particle.y;
      var v = field(x, y); // vector at current position
      var m = v[2];
      if (m === null) {
        particle.age = MAX_PARTICLE_AGE; // particle has escaped the grid, never to return...
      } else {
        var xt = x + v[0];
        var yt = y + v[1];
        if (field(xt, yt)[2] !== null) {
          // Path from (x,y) to (xt,yt) is visible, so add this particle to the appropriate draw bucket.
          particle.xt = xt;
          particle.yt = yt;
          colorGroup[particle.color] = colorGroup[particle.color] || [];
          colorGroup[particle.color].push(particle);
        } else {
          // Particle isn't visible, but it still moves through the field.
          particle.x = xt;
          particle.y = yt;
        }
      }
      particle.age += 1;
    });
  }


  var g = ctx;
  // var g = params.ctx;

  g.lineWidth = PARTICLE_LINE_WIDTH;
  // g.fillStyle = fadeFillStyle;
  g.globalAlpha = 0.6;

  function draw() {
    if (g.start2D) g.start2D();
    // Fade existing particle trails.
    var prev = 'lighter';
    g.globalCompositeOperation = 'destination-in';
    if (!g.start2D) g.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    g.globalCompositeOperation = prev;
    g.globalAlpha = 0.92;

    for (let key in colorGroup) {
      g.beginPath();
      g.strokeStyle = key;
      colorGroup[key].forEach(function (item) {
        g.moveTo(item.x, item.y);
        g.lineTo(item.xt, item.yt);
        item.x = item.xt;
        item.y = item.yt;
      });
      g.stroke();
    }

    if (g.finish2D) g.finish2D();
  }

  let pass = new Date().getTime();
  let now = 0;
  (function frame() {
    if (animationLoop) cancelAnimationFrame(animationLoop);
    now = new Date().getTime();
    if (now - pass > 30 ) {
      pass = now;
      evolve();
      draw();
    }
    animationLoop = requestAnimationFrame(frame);
  })();
}

function buildBounds(bounds, width, height) {
  var upperLeft = bounds[0];
  var lowerRight = bounds[1];
  var x = Math.round(upperLeft[0]); //Math.max(Math.floor(upperLeft[0], 0), 0);
  var y = Math.max(Math.floor(upperLeft[1]), 0);
  var xMax = Math.min(Math.ceil(lowerRight[0]), width - 1);
  var yMax = Math.min(Math.ceil(lowerRight[1]), height - 1);
  return { x: x, y: y, xMax: width, yMax: yMax, width: width, height: height };
}

function searchColor(data, value) {
  const len = data.length;
  const min = 0;
  const max = 10;
  const index = Math.max(
    0,
    Math.min(len - 1, Math.round(((value - min) / (max - min)) * (len - 1)))
  );
  return data[index];
}

function rad2deg(ang) {
  return ang / (Math.PI / 180.0);
}
function invert(x, y, windy) {
  var mapLonDelta = windy.east - windy.west;
  var worldMapRadius = ((windy.width / rad2deg(mapLonDelta)) * 360) / (2 * Math.PI);
  var mapOffsetY =
    (worldMapRadius / 2) * Math.log((1 + Math.sin(windy.south)) / (1 - Math.sin(windy.south)));
  var equatorY = windy.height + mapOffsetY;
  var a = (equatorY - y) / worldMapRadius;

  var lat = (180 / Math.PI) * (2 * Math.atan(Math.exp(a)) - Math.PI / 2);
  var lon = rad2deg(windy.west) + (x / windy.width) * rad2deg(mapLonDelta);
  return [lon, lat];
}

function distort(projection, λ, φ, x, y, scale, wind, windy) {
  var u = wind[0] * scale;
  var v = wind[1] * scale;
  var d = distortion(projection, λ, φ, x, y, windy);
  wind[0] = d[0] * u + d[2] * v;
  wind[1] = d[1] * u + d[3] * v;
  return wind;
}

function interpolateField(grid, bounds, extent) {
  var projection = {};
  var mapArea = (extent.south - extent.north) * (extent.west - extent.east);
  var velocityScale = VELOCITY_SCALE * Math.pow(mapArea, 0.4);

  var columns = [];

  for (let x = 0; x < bounds.width; x++) {
    // 创建一列数据
    var column = [];
    for (var y = bounds.y; y <= bounds.yMax; y++) {
      var coord = invert(x, y, extent);
      if (coord) {
        var λ = coord[0],
          φ = coord[1];
        if (isFinite(λ)) {
          var wind = grid.interpolate(λ, φ);
          if (wind) {
            wind = distort(projection, λ, φ, x, y, velocityScale, wind, extent);
            column[y] = wind;
          }
        }
      }
    }
    columns[x] = column;
  }

  return columns;
}

function dataToGrid(builder) {
  const header = builder.header;
  const grid = [];
  let idx = 0;
  var isContinuous = Math.floor(header.nx * header.dx) >= 360;
  for (let row = 0; row < header.ny; row++) {
    const rowData = [];
    for (let column = 0; column < header.nx; column++) {
      rowData[column] = builder.data(idx);
      idx++;
    }
    // 不知道为什么要追加一列，先保持一致行为，后期再来研究
    if (isContinuous) {
      // For wrapped grids, duplicate first column as last column to simplify interpolation logic
      rowData.push(rowData[0]);
    }
    grid[row] = rowData;
  }

  return {
    data: grid,
    interpolate: function (λ, φ) {
      return toto(grid, λ, φ, header, builder);
    }
  };
}

/**
 * 此插件以视觉左上角为圆点
 * 以右为0°，顺时针方向旋转
 */
var Wind = (function () {
  function Plugin(canvas) {
    this._colors = [
      'rgb(36,104, 180)',
      'rgb(60,157, 194)',
      'rgb(128,205,193 )',
      'rgb(151,218,168 )',
      'rgb(198,231,181)',
      'rgb(238,247,217)',
      'rgb(255,238,159)',
      'rgb(252,217,125)',
      'rgb(255,182,100)',
      'rgb(252,150,75)',
      'rgb(250,112,52)',
      'rgb(245,64,32)',
      'rgb(237,45,28)',
      'rgb(220,24,32)',
      'rgb(180,0,35)'
    ];
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
  }

  Plugin.prototype.setGfsData = function (data) {
    this._data = data;
  };

  Plugin.prototype.getGfsData = function () {
    return this._data || [];
  };

  Plugin.prototype.start = function (bounds, width, height, extent) {
    this._canvas.width = width;
    this._canvas.height = height;
    this._canvas.style.width = width + 'px';
    this._canvas.style.height = height + 'px';

    var mapBounds = {
      south: deg2rad(extent[0][1]),
      north: deg2rad(extent[1][1]),
      east: deg2rad(extent[1][0]),
      west: deg2rad(extent[0][0]),
      width: width,
      height: height
    };
    const data = this.getGfsData();
    const canvasBounds = buildBounds(bounds, width, height);
    const builder = createWindItem(data);
    const gridList = dataToGrid(builder);
    const pxColumns = interpolateField(gridList, canvasBounds, mapBounds);
    const field = createField(pxColumns, canvasBounds, this._colors);
    animate(this._ctx, canvasBounds, field, mapBounds);
  };

  return Plugin;
})();
