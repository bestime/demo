var utils = (function () { 
  function apiGetBoundary (url) {
    return axios.get(url).then(function (res) {
      const item = res.data.features[0]
      return {
        data: item.geometry.coordinates[0],
        center: item.properties.center
      }
    })
  }

  return {
    apiGetBoundary
  }
})();

