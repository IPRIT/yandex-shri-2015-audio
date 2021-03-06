var Waveform = (function() {
  function Waveform(options) {
    this.container = options.container;
    this.canvas = options.canvas;
    this.data = options.data || [];
    this.outerColor = options.outerColor || "transparent";
    this.innerColor = options.innerColor || "#000000";

    this.interpolate = options.interpolate !== false;
    if (this.canvas == null) {
      if (this.container) {
        this.canvas = this.createCanvas(this.container, options.width || this.container.clientWidth, options.height || this.container.clientHeight);
      } else {
        throw "Either canvas or container option must be passed";
      }
    }
    this.patchCanvasForIE(this.canvas);
    this.context = this.canvas.getContext("2d");
    this.width = parseInt(this.context.canvas.offsetWidth, 10);
    this.height = parseInt(this.context.canvas.offsetHeight, 10);
    if (options.data) {
      this.setData(options.data);
    }
    this.redraw();
  }

  Waveform.prototype.setData = function(data) {
    return this.data = data;
  };

  Waveform.prototype.setDataInterpolated = function(data) {
    return this.setData(this.interpolateArray(data, this.context.canvas.offsetWidth));
  };

  Waveform.prototype.setDataCropped = function(data) {
    return this.setData(this.expandArray(data, this.context.canvas.offsetWidth));
  };

  var drawVisual = false;
  Waveform.prototype.update = function(options) {
    this.data = options.data;
  };

  Waveform.prototype.redraw = function() {
    var $this = this;
    drawVisual = requestAnimationFrame($this.redraw.bind($this));
    var bufferLength = 256;
    this.context.fillStyle = 'white';
    this.context.fillRect(0, 0, this.context.canvas.offsetWidth, this.context.canvas.offsetHeight);

    var barWidth = (this.context.canvas.offsetWidth / bufferLength) * 2.5;
    var barHeight;
    var x = -100;

    for (var i = 0; i < bufferLength; i++) {
      barHeight = this.data[i] / 2.0;

      this.context.fillStyle = '#989898';
      this.context.fillRect(x,this.context.canvas.offsetHeight-barHeight/2,barWidth,barHeight/2);

      x += barWidth + 1;
    }
  };

  Waveform.prototype.clear = function() {
    this.context.fillStyle = this.outerColor;
    this.context.clearRect(0, 0, this.context.canvas.offsetWidth, this.context.canvas.offsetHeight);
    return this.context.fillRect(0, 0, this.context.canvas.offsetWidth, this.context.canvas.offsetHeight);
  };

  Waveform.prototype.patchCanvasForIE = function(canvas) {
    var oldGetContext;
    if (typeof window.G_vmlCanvasManager !== "undefined") {
      canvas = window.G_vmlCanvasManager.initElement(canvas);
      oldGetContext = canvas.getContext;
      return canvas.getContext = function(a) {
        var ctx;
        ctx = oldGetContext.apply(canvas, arguments);
        canvas.getContext = oldGetContext;
        return ctx;
      };
    }
  };

  Waveform.prototype.createCanvas = function(container, width, height) {
    var canvas;
    canvas = document.createElement("canvas");
    container.appendChild(canvas);
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    return canvas;
  };

  Waveform.prototype.expandArray = function(data, limit, defaultValue) {
    var i, newData, _i, _ref;
    if (defaultValue == null) {
      defaultValue = 0.0;
    }
    newData = [];
    if (data.length > limit) {
      newData = data.slice(data.length - limit, data.length);
    } else {
      for (i = _i = 0, _ref = limit - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        newData[i] = data[i] || defaultValue;
      }
    }
    return newData;
  };

  Waveform.prototype.linearInterpolate = function(before, after, atPoint) {
    return before + (after - before) * atPoint;
  };

  Waveform.prototype.interpolateArray = function(data, fitCount) {
    var after, atPoint, before, i, newData, springFactor, tmp;
    newData = new Array();
    springFactor = new Number((data.length - 1) / (fitCount - 1));
    newData[0] = data[0];
    i = 1;
    while (i < fitCount - 1) {
      tmp = i * springFactor;
      before = new Number(Math.floor(tmp)).toFixed();
      after = new Number(Math.ceil(tmp)).toFixed();
      atPoint = tmp - before;
      newData[i] = this.linearInterpolate(data[before], data[after], atPoint);
      i++;
    }
    newData[fitCount - 1] = data[data.length - 1];
    return newData;
  };

  return Waveform;
})();