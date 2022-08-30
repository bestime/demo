// @ts-nocheck
/*global define */
/**
 * 注意：建议引入静态文件，不建议通过import载入
 *
 * @see [地图蒙版示例](https://github.com/bestime/demo/tree/main/pages/maptalks)
 * @author bestime
 */
 var YouYangMaptalksMaskPlugin = (function () {
  function getJsFileBaseUrl (tir) {
    tir = tir || 0 
    var reg = '\/[^/]*', arr = document.scripts;
    for (var a = 0; a < tir; a++) {
      reg += reg
    }
    return arr[arr.length-1].src.replace(new RegExp(reg + '$'), '');
  }
  var currentFolder = getJsFileBaseUrl()
  
  // 地图插件，为了不用 import 方式引入，所以该插件为静态插件
  var TileLayer, VectorLayer, Polygon, httpRequest, turfSplit;

  function apiGetBoundary(url) {
    return httpRequest.get(url).then(function (res) {
      return res.data.features[0].geometry.coordinates[0];
    });
  }

  const info = {
    "酉阳": {
      url: currentFolder + "/json/boundary-yy.json",
      translate: [2, 2.5, 5],
      angle: 160,
    },
    "花田乡": {
      url: currentFolder + "/json/boundary-htx.json",
      translate: [0.5, 0.6, 1.2],
      angle: 140,
    },
  };

  function Main(map, areaName, options) {
    this._layers = [];
    this._areaName = areaName;
    this._iMap = map;
    this._mounted = true
    Polygon = options.Polygon;
    VectorLayer = options.VectorLayer;
    TileLayer = options.TileLayer;
    httpRequest = options.httpRequest;
    turfSplit = options.turfSplit
  }

  Main.prototype.getTranslateBoundary = function (data, offset) {
    var ext = info[this._areaName];
    var res = turfSplit.transformTranslate(data, offset, ext.angle);
    res = res.geometry.coordinates[0];
    // console.log("顶顶顶", res)
    return res;
  };

  Main.prototype.render = function (callback) {
    var ext = info[this._areaName];
    apiGetBoundary(ext.url).then((boundary) => {
      this.clear();
      if(!this._mounted) return;
      var trufBoundary = turfSplit.polygon(boundary);
      
      const map = this._iMap;
      var maskPolygon = new Polygon(boundary);

      // 边框多边形
      const borderPolygon = maskPolygon.copy();
      borderPolygon.setSymbol({
        lineColor: "#55baa2",
        lineWidth: 2,
        polygonFillOpacity: 0,
      });

      // 投影多边形（位移实现）
      const offsetPolygon = new Polygon(
        this.getTranslateBoundary(trufBoundary, ext.translate[0])
      );
      offsetPolygon.setSymbol([
        {
          lineWidth: 0,
          polygonFill: "#105541",
          polygonOpacity: 1,
        },
      ]);

      // 发光多边形
      const blurPolygon = new Polygon(
        this.getTranslateBoundary(trufBoundary, ext.translate[1])
      );
      blurPolygon.setSymbol([
        {
          lineWidth: 0,
          polygonFill: "rgba(111,214,229,0.9)",
          polygonOpacity: 1,
        },
      ]);

      // 投影最底层多边形（位移实现）
      const offsetBlackPolygon = new Polygon(
        this.getTranslateBoundary(trufBoundary, ext.translate[2])
      );
      offsetBlackPolygon.setSymbol([
        {
          lineWidth: 0,
          polygonFill: "#1e3832",
          polygonOpacity: 1,
        },
      ]);

      //////////////// 【创建图层】  //////////////////////////////////

      // 发光图层
      var blurLayer = new VectorLayer(this._areaName + "blurLayer", {
        cssFilter: "blur(6px)",
      }).addGeometry([blurPolygon]);

      // 投影图层
      var shadowLayer = new VectorLayer(this._areaName + "shadowLayer", {
        cssFilter: "blur(1px)",
      }).addGeometry([offsetPolygon]);
      var shadowLayer02 = new VectorLayer(
        this._areaName + "shadowLayer02"
      ).addGeometry([offsetBlackPolygon]);

      // 边框图层
      var borderLayer = new VectorLayer(
        this._areaName + "borderLayer"
      ).addGeometry([borderPolygon]);

      // 瓦片蒙版图层
      var maskedLayer = new TileLayer(this._areaName + "masked", {
        urlTemplate:
          "http://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=d89f15365eb3645f72f26c32f3afb3e8",
        subdomains: [1, 2, 3, 4],
      });
      maskedLayer.setMask(maskPolygon); // set boundary as the mask to the tilelayer

      // 将所有图层按指定顺序绘制在地图上
      this._layers = [
        shadowLayer02,
        blurLayer,
        shadowLayer,
        maskedLayer,
        borderLayer,
      ];
      map.addLayer(this._layers);

      callback && callback()
    });

    return this;
  };

  Main.prototype.clear = function () {
    for (let a = 0; a < this._layers.length; a++) {
      this._layers[a].clear().remove();
      this._layers.splice(a--, 1);
    }
  };

  Main.prototype.dispose = function () {
    this._layers = undefined;
    this._iMap = undefined;
    this._mounted = false
  };

  return Main;
})();
