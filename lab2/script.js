// 1. 设置 Access Token
// The value for 'accessToken' begins with 'pk...'
mapboxgl.accessToken =
  "pk.eyJ1IjoiamlhbmdoZW5nMDQwNyIsImEiOiJjbWtjbzRrZnowMnNmM2txb2ZxZ2thdW5rIn0.FupLfDx2ZY_8b1bAlvZheg";

// 2. 初始化地图
// Define a map object by initialising a Map from Mapbox
const map = new mapboxgl.Map({
  container: "map",
  // Replace YOUR_STYLE_URL with your style URL.
  style: "mapbox://styles/jiangheng0407/cmktnw2yi007k01sd9j6245vu",
  center: [-4.2518, 55.8642], // 格拉斯哥的经度(Longitude)和纬度(Latitude)
  zoom: 10
  // 设置缩放级别，数值越大地图越详细（建议 10-13 之间）
});

// 3. 当地图加载完成后执行的操作
map.on("load", () => {
  // 添加高亮数据源和图层
  map.addSource("hover", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] }
  });

  map.addLayer({
    id: "dz-hover",
    type: "line",
    source: "hover",
    layout: {},
    paint: {
      "line-color": "red",
      "line-width": 4
    }
  });

  // 鼠标移动监听事件
  map.on("mousemove", (event) => {
    const dzone = map.queryRenderedFeatures(event.point, {
      layers: ["simd-glasgow-2020-8bwpgd"] // 确保这里和 Studio 左侧图层名一致
    });

    if (dzone.length > 0) {
      // 1. 获取属性
      const props = dzone[0].properties;

      // 2. 修正字段名：根据截图，数据字段应为 Decilev2
      // 如果 DZName 不显示，尝试改为全小写 dzname 或 DataZone
      const name = props.DZName || props.dzname || "Unknown Zone";
      const rank = props.Decilev2 || props.Percentv2 || "N/A";

      // 3. 更新悬浮窗文字
      document.getElementById(
        "pd"
      ).innerHTML = `<h3>${name}</h3><p>Decile: <strong>${rank}</strong></p>`;
      map.getCanvas().style.cursor = "pointer";

      // 4. 更新红色边框
      map.getSource("hover").setData({
        type: "FeatureCollection",
        features: dzone.map((f) => ({ type: "Feature", geometry: f.geometry }))
      });
    } else {
      document.getElementById(
        "pd"
      ).innerHTML = `<p>Hover over a data zone!</p>`;
      map.getCanvas().style.cursor = "";
      map
        .getSource("hover")
        .setData({ type: "FeatureCollection", features: [] });
    }
  });

  //创建图例
  const layers = [
    "<10",
    "20 ",
    "30 ",
    "40 ",
    "50 ",
    "60 ",
    "70 ",
    "80 ",
    "90 ",
    "100"
  ];
  const colors = [
    "#67001f",
    "#b2182b",
    "#d6604d",
    "#f4a582",
    "#fddbc7",
    "#d1e5f0",
    "#92c5de",
    "#4393c3",
    "#2166ac",
    "#053061"
  ];
  const legend = document.getElementById("legend");

  layers.forEach((layer, i) => {
    const color = colors[i];
    const key = document.createElement("div"); // 直接创建方块 div
    key.className = "legend-key";
    key.style.backgroundColor = color;
    key.innerHTML = layer; // 关键：文字直接写入方块

    // 自动判断文字颜色：深色背景用白字，浅色用黑字，确保醒目
    // 索引 4(50), 5(60), 6(70) 是浅色系
    if (i >= 4 && i <= 6) {
      key.style.color = "black";
    } else {
      key.style.color = "white";
    }

    legend.appendChild(key); // 直接添加方块，不要再 append item 了
  });
});

// 4. 添加控件
map.addControl(new mapboxgl.NavigationControl(), "top-left");
map.addControl(
  new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading: true
  }),
  "top-left"
);

const geocoder = new MapboxGeocoder({
  // Initialize the geocoder
  accessToken: mapboxgl.accessToken, // Set the access token
  mapboxgl: mapboxgl, // Set the mapbox-gl instance
  marker: false, // Do not use the default marker style
  placeholder: "Search for places in Glasgow", // Placeholder text for the search bar
  proximity: {
    longitude: -4.2518,
    latitude: 55.8642
  } // Coordinates of Glasgow center
});
map.addControl(geocoder, "top-left");