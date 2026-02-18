mapboxgl.accessToken = "pk.eyJ1IjoiamlhbmdoZW5nMDQwNyIsImEiOiJjbWtjbzRrZnowMnNmM2txb2ZxZ2thdW5rIn0.FupLfDx2ZY_8b1bAlvZheg";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/jiangheng0407/cmls0rr8v002201sl0gkl8s6x",
  center: [-4.2518, 55.8642],
  zoom: 12
});

const USER_LOCATION = [-4.2518, 55.8611];
const CAFE_ID = 'cafes';
const LIB_ID = 'libraries';
const hoverPopup = new mapboxgl.Popup({ closeButton: false, offset: 15 });
let activeSearchPopups = [];
let currentCircle = null;

// 1. 坐标转方位并去负号 / Format coords
function formatCoords(lng, lat) {
  const lnDir = lng >= 0 ? 'E' : 'W';
  const ltDir = lat >= 0 ? 'N' : 'S';
  return `(${Math.abs(lat).toFixed(4)}°${ltDir}, ${Math.abs(lng).toFixed(4)}°${lnDir})`;
}

// 2. 地址处理 / Address logic
function getFullAddr(p, isLib) {
  if (isLib) return p.ADDRESS || "Glasgow";
  const l1 = p.AddressLine1 ? p.AddressLine1.trim() : "";
  const l2 = p.AddressLine2 ? p.AddressLine2.trim() : "";
  return (l1 && l2) ? `${l1}, ${l2}` : (l1 || l2 || "Glasgow");
}

// 3. 构建详细悬浮窗 / Popup content
function buildPopupContent(f) {
  const p = f.properties;
  const isLib = f.layer.id === LIB_ID;
  const coords = f.geometry.coordinates;
  const dist = turf.distance(USER_LOCATION, coords, {units: 'kilometers'}).toFixed(2);
  const link = isLib ? (p.HYPERLINK || "#") : "#";
  const postcodeRow = isLib ? "" : `📮 <b>Postcode:</b> ${p.PostCode || "N/A"} <br>`;

  return `
    <div style="min-width:180px;">
      <span class="popup-title">${p.BusinessName || p.NAME}</span>
      <div class="popup-row">
        ${isLib ? `🔗 <b>Link:</b> <a href="${link}" target="_blank" style="color:#8e44ad">${link}</a>` : `⭐ <b>Rating:</b> ${p.RatingValue || "N/A"}`} <br>
        📏 <b>Distance:</b> ${dist} km <br>
        📍 <b>Address:</b> ${getFullAddr(p, isLib)} <br>
        ${postcodeRow}
        🌐 <b>Location:</b> ${formatCoords(coords[0], coords[1])}
      </div>
    </div>`;
}

// 4. 全局过滤联动 / Unified filter
function applyGlobalFilters() {
  const showCafe = document.getElementById('layer-cafes').checked;
  const showLib = document.getElementById('layer-libraries').checked;
  [CAFE_ID, LIB_ID].forEach(id => {
    const isVisible = (id === CAFE_ID && showCafe) || (id === LIB_ID && showLib);
    map.setLayoutProperty(id, 'visibility', isVisible ? 'visible' : 'none');
    if (isVisible) map.setFilter(id, currentCircle ? ["within", currentCircle] : null);
  });
}

map.on("load", () => {
  const input = document.getElementById('local-search');
  const suggest = document.getElementById('suggestions');

  // UI 交互事件 / UI Events
  document.getElementById('toggle-sidebar').onclick = () => document.getElementById('console').classList.toggle('collapsed');
  document.getElementById('zoom-in').onclick = () => map.zoomIn();
  document.getElementById('zoom-out').onclick = () => map.zoomOut();
  document.getElementById('compass-btn').onclick = () => map.easeTo({ bearing: 0, pitch: 0 });

  // 搜索逻辑 / Search logic
  function doSearch(query) {
    suggest.innerHTML = '';
    activeSearchPopups.forEach(p => p.remove());
    activeSearchPopups = [];
    const term = query.toLowerCase().trim();
    if (!term) return;

    const features = map.queryRenderedFeatures({ layers: [CAFE_ID, LIB_ID] });
    const matches = features.filter((f, i, self) => {
      const name = (f.properties.BusinessName || f.properties.NAME || "").toLowerCase();
      return name.includes(term) && self.findIndex(t => (t.properties.BusinessName || t.properties.NAME) === (f.properties.BusinessName || f.properties.NAME)) === i;
    });

    if (matches.length === 0) {
      input.value = ""; input.placeholder = "No results found.";
      setTimeout(() => { input.placeholder = "Search name or address..."; }, 2000);
      return;
    }

    matches.forEach(f => {
      const pop = new mapboxgl.Popup({ closeButton: false, offset: 15 }).setLngLat(f.geometry.coordinates).setHTML(buildPopupContent(f)).addTo(map);
      activeSearchPopups.push(pop);
      const el = document.createElement('div'); el.className = 'blink-marker';
      const m = new mapboxgl.Marker(el).setLngLat(f.geometry.coordinates).addTo(map);
      setTimeout(() => m.remove(), 3000);
    });
    map.flyTo({ center: matches[0].geometry.coordinates, zoom: 15 });
  }

  // 联想建议 / Suggestions logic
  input.oninput = () => {
    const val = input.value.toLowerCase().trim();
    suggest.innerHTML = '';
    if (!val) return;
    const features = map.queryRenderedFeatures({ layers: [CAFE_ID, LIB_ID] });
    const seen = new Set();
    features.forEach(f => {
      const name = f.properties.BusinessName || f.properties.NAME;
      if (name && name.toLowerCase().includes(val) && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `<strong>${name}</strong>`;
        item.onclick = () => { input.value = name; doSearch(name); };
        suggest.appendChild(item);
      }
    });
  };

  document.getElementById('search-btn').onclick = () => doSearch(input.value);
  input.onkeypress = (e) => { if(e.key === 'Enter') doSearch(input.value); };

  // 范围搜索 / Buffer logic
  const runBuf = (r) => {
    const center = map.getCenter();
    currentCircle = turf.circle([center.lng, center.lat], r/1000, {units: 'kilometers'});
    if (map.getSource('buf-s')) map.getSource('buf-s').setData(currentCircle);
    else {
      map.addSource('buf-s', { type: 'geojson', data: currentCircle });
      map.addLayer({ id: 'buf-f', type: 'fill', source: 'buf-s', paint: { 'fill-color': '#8e44ad', 'fill-opacity': 0.1 } });
    }
    applyGlobalFilters();
  };

  document.getElementById('btn-500').onclick = () => runBuf(500);
  document.getElementById('btn-1000').onclick = () => runBuf(1000);
  document.getElementById('custom-dist').oninput = (e) => { if(e.target.value > 0) runBuf(e.target.value * 1000); };
  
  document.getElementById('clear-btn').onclick = () => {
    if (map.getLayer('buf-f')) { map.removeLayer('buf-f'); map.removeSource('buf-s'); }
    currentCircle = null; applyGlobalFilters();
    activeSearchPopups.forEach(p => p.remove());
    input.value = "";
  };

  document.getElementById('layer-cafes').onchange = applyGlobalFilters;
  document.getElementById('layer-libraries').onchange = applyGlobalFilters;

  // 鼠标悬停 / Mousemove
  map.on('mousemove', (e) => {
    const fs = map.queryRenderedFeatures(e.point, { layers: [CAFE_ID, LIB_ID] });
    if (fs.length > 0) {
      map.getCanvas().style.cursor = 'pointer';
      hoverPopup.setLngLat(fs[0].geometry.coordinates).setHTML(buildPopupContent(fs[0])).addTo(map);
    } else {
      map.getCanvas().style.cursor = '';
      hoverPopup.remove();
    }
  });
});