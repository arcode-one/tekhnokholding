import { loadAsset as load } from '../lib/assets.js';

export default function init(section) {
  const view = section.querySelector('[data-map-view]');
  const status = section.querySelector('[data-map-status]');
  const citySelect = section.querySelector('[data-map-city]');
  const projectSelect = section.querySelector('[data-map-project]');
  const card = section.querySelector('[data-map-card]');
  const list = section.querySelector('[data-map-list]');
  const listItems = section.querySelector('[data-map-list-items]');
  const itemTemplate = section.querySelector('[data-map-list-template]');
  const backButton = section.querySelector('[data-map-card-back]');
  const pitchButton = section.querySelector('[data-map-pitch]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  const compact = matchMedia('(max-width: 1099px)');
  const defaultCity = 'Челябинск';
  const defaultCenter = [61.4026, 55.18];
  const overviewZoom = () => (view.clientWidth < 600 ? 9.2 : view.clientWidth < 900 ? 10 : 10.4);
  const overviewPadding = { top: 126, right: 70, bottom: 70, left: 70 };
  const placeholder = 'icons/image-placeholder.svg';
  const precisionNotes = {
    address: '',
    street: 'Примерное расположение по указанной улице.',
    area: 'Примерное расположение в указанном районе или на территории объекта.',
    city: 'На карте указан населённый пункт. Расположение объекта примерное.',
    region: 'На карте указан регион. Расположение объекта примерное.',
    unknown: 'Расположение объекта не указано.',
  };
  let map;
  let records = [];
  let markers = [];
  let selected = '';
  let activeGroup = null;
  let opener = null;
  let cardOpener = null;
  let hoverTimer = 0;
  section.dataset.mapState = 'waiting';

  const preload = () => {
    load(section.dataset.mapStyle, 'css').catch(() => {});
    load(section.dataset.mapScript, 'js').catch(() => {});
  };
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
  if (document.readyState === 'complete') idle(preload, { timeout: 1500 });
  else window.addEventListener('load', () => idle(preload, { timeout: 1500 }), { once: true });

  function visibleRecords() {
    return records.filter((record) => !citySelect.value || record.city === citySelect.value);
  }

  function updateSelection() {
    markers.forEach((group) => {
      const active = selected
        ? group.records.some((record) => record.id === selected)
        : !!activeGroup &&
          group.records.some((record) => activeGroup.records.some((item) => item.id === record.id));
      group.button.classList.toggle('company-map-marker--active', active);
      group.button.setAttribute('aria-expanded', String(active));
    });
    listItems.querySelectorAll('[data-map-list-project]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.mapListProject === selected));
    });
    // На узком экране список уступает место карточке, но сохраняет свою прокрутку.
    list.hidden = !activeGroup || (compact.matches && !card.hidden);
    backButton.hidden = !activeGroup;
  }

  function closePanels(restoreFocus = false) {
    clearTimeout(hoverTimer);
    selected = '';
    activeGroup = null;
    card.hidden = true;
    projectSelect.value = '';
    updateSelection();
    if (restoreFocus && opener?.isConnected && !opener.hidden)
      opener.focus({ preventScroll: true });
  }

  function closeCard(restoreFocus = false) {
    selected = '';
    card.hidden = true;
    projectSelect.value = '';
    updateSelection();
    const target = cardOpener?.isConnected ? cardOpener : opener;
    if (restoreFocus && target && !target.hidden) target.focus({ preventScroll: true });
  }

  function setImage(image, record) {
    image.src = record.cover || placeholder;
    image.alt = record.title;
    image.onerror = () => {
      image.onerror = null;
      image.src = placeholder;
    };
  }

  function setFact(name, value) {
    const row = card.querySelector(`[data-map-card-row="${name}"]`);
    row.hidden = !value;
    row.querySelector('dd').textContent = value || '';
  }

  function showProject(id, { fly = false, fromList = false, trigger = null, focus = false } = {}) {
    const record = records.find((item) => item.id === id);
    if (!record) return;
    clearTimeout(hoverTimer);
    if (!fromList) {
      activeGroup = null;
      opener = trigger;
    }
    cardOpener = trigger;
    selected = id;
    projectSelect.value = id;
    setImage(card.querySelector('[data-map-card-image]'), record);
    card.querySelector('[data-map-card-title]').textContent = record.title;
    card.querySelector('[data-map-card-address]').textContent =
      record.mapAddress || record.address || record.city || 'Адрес не указан';
    const note = card.querySelector('[data-map-card-precision]');
    note.textContent = precisionNotes[record.precision] || '';
    note.hidden = !note.textContent;
    setFact('area', record.area);
    setFact('year', record.year);
    setFact('roof', record.roof);
    card.querySelector('[data-map-card-link]').href = `objects/${record.id}.html`;
    card.hidden = false;
    card.querySelector('.company-map__card-content').scrollTop = 0;
    updateSelection();
    if (focus) card.querySelector('[data-map-card-close]').focus({ preventScroll: true });
    // Наведение и нажатие на метку не двигают карту. Поиск через select приближает объект.
    if (map && fly && record.coordinates) {
      map.flyTo({
        center: record.coordinates,
        zoom: { address: 15.5, street: 13, area: 13, city: 11, region: 7 }[record.precision] || 11,
        pitch: 0,
        bearing: 0,
        padding: compact.matches
          ? { left: 30, right: 30, top: 40, bottom: Math.min(view.clientHeight * 0.5, 300) }
          : { left: 60, right: 420, top: 60, bottom: 60 },
        retainPadding: false,
        duration: reduced.matches ? 0 : 600,
      });
      pitchButton.setAttribute('aria-pressed', 'false');
    }
  }

  function showGroup(group, focus = false) {
    clearTimeout(hoverTimer);
    if (activeGroup !== group) {
      listItems.replaceChildren();
      group.records.forEach((record) => {
        const item = itemTemplate.content.firstElementChild.cloneNode(true);
        const button = item.querySelector('button');
        button.dataset.mapListProject = record.id;
        button.setAttribute('aria-label', `Открыть объект: ${record.title}`);
        setImage(item.querySelector('img'), record);
        item.querySelector('[data-map-list-title]').textContent = record.title;
        item.querySelector('[data-map-list-address]').textContent =
          record.mapAddress || record.address || record.city;
        ['area', 'year'].forEach((name) => {
          const fact = item.querySelector(`[data-map-list-${name}]`);
          fact.hidden = !record[name];
          fact.querySelector('strong').textContent = record[name] || '';
        });
        listItems.append(item);
      });
      listItems.scrollTop = 0;
    }
    selected = '';
    projectSelect.value = '';
    activeGroup = group;
    opener = group.button;
    card.hidden = true;
    section.querySelector('[data-map-list-count]').textContent = group.records.length;
    updateSelection();
    if (focus) list.querySelector('[data-map-list-close]').focus({ preventScroll: true });
  }

  function openMarker(group, focus = false) {
    if (group.records.length > 1) showGroup(group, focus);
    else showProject(group.records[0].id, { trigger: group.button, focus });
  }

  function renderMarkers() {
    if (!map) return;
    const previous = new Map(markers.map((group) => [group.key, group]));
    const next = [];
    const groups = new Map();
    visibleRecords()
      .filter((record) => record.coordinates)
      .forEach((record) => {
        // Одна координата = одна метка. Не раздвигаем объекты с неизвестным адресом.
        const key = record.coordinates.map((value) => value.toFixed(6)).join(',');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(record);
      });
    // Близкие точки объединяются по экранному расстоянию и разделяются при зуме.
    // Координаты объектов остаются исходными; метка группы стоит на первой точке.
    const clusters = [];
    groups.forEach((items) => {
      const point = map.project(items[0].coordinates);
      const nearby = clusters.find((cluster) => point.dist(cluster.point) < 58);
      if (nearby) nearby.records.push(...items);
      else clusters.push({ point, records: [...items] });
    });
    clusters.forEach(({ records: items }) => {
      const key = items.map((record) => record.id).join('|');
      const existing = previous.get(key);
      if (existing) {
        previous.delete(key);
        next.push(existing);
        return;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'company-map-marker';
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', items.length > 1 ? list.id : card.id);
      const place =
        new Set(items.map((record) => record.city)).size === 1 ? items[0].city : 'Карта';
      button.setAttribute(
        'aria-label',
        items.length > 1
          ? `${place}: объектов в группе ${items.length}`
          : `Открыть объект: ${items[0].title}`,
      );
      const logo = document.createElement('img');
      logo.src = 'icons/logo-mark.svg';
      logo.alt = '';
      logo.width = 30;
      logo.height = 27;
      button.append(logo);
      if (items.length > 1) {
        const count = document.createElement('span');
        count.className = 'company-map-marker__count';
        count.textContent = items.length;
        count.setAttribute('aria-hidden', 'true');
        button.append(count);
      }
      const group = { key, button, records: items };
      button.addEventListener('pointerenter', (event) => {
        if (!mouse.matches || event.pointerType === 'touch' || map.isMoving()) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => openMarker(group), 140);
      });
      button.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        openMarker(group, event.detail === 0);
      });
      group.marker = new maplibregl.Marker({ element: button, anchor: 'bottom' })
        .setLngLat(items[0].coordinates)
        .addTo(map);
      next.push(group);
    });
    previous.forEach((group) => group.marker.remove());
    markers = next;
    if (opener && !opener.isConnected) {
      const id = selected || activeGroup?.records[0].id;
      opener =
        markers.find((group) => group.records.some((record) => record.id === id))?.button ||
        projectSelect;
    }
    updateSelection();
  }

  function filterOptions() {
    projectSelect.replaceChildren(
      new Option('Выберите объект', ''),
      ...visibleRecords().map((record) => new Option(record.title, record.id)),
    );
    renderMarkers();
  }

  function boundsFor(items) {
    const points = items.filter((record) => record.coordinates);
    if (!points.length) return null;
    const bounds = new maplibregl.LngLatBounds();
    points.forEach((record) => bounds.extend(record.coordinates));
    return bounds;
  }

  function fit(items) {
    if (!map) return;
    pitchButton.setAttribute('aria-pressed', 'false');
    const bounds = boundsFor(items);
    if (!bounds) return;
    map.fitBounds(bounds, {
      padding: citySelect.value === defaultCity ? overviewPadding : 70,
      maxZoom: citySelect.value === defaultCity ? overviewZoom() : 12,
      pitch: 0,
      bearing: 0,
      duration: reduced.matches ? 0 : 600,
    });
  }

  projectSelect.addEventListener('change', () => {
    if (projectSelect.value)
      showProject(projectSelect.value, { fly: true, trigger: projectSelect });
    else closePanels();
  });
  citySelect.addEventListener('change', () => {
    closePanels();
    filterOptions();
    fit(visibleRecords());
  });
  listItems.addEventListener('click', (event) => {
    const button = event.target.closest('[data-map-list-project]');
    if (button)
      showProject(button.dataset.mapListProject, {
        fromList: true,
        trigger: button,
        focus: event.detail === 0 || compact.matches,
      });
  });
  section.querySelector('[data-map-card-close]').addEventListener('click', () => closeCard(true));
  section.querySelector('[data-map-list-close]').addEventListener('click', () => closePanels(true));
  backButton.addEventListener('click', () => closeCard(true));
  section.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || (card.hidden && list.hidden)) return;
    event.preventDefault();
    if (!card.hidden) closeCard(true);
    else closePanels(true);
  });
  compact.addEventListener('change', updateSelection);
  section.querySelectorAll('[data-map-zoom]').forEach((button) => {
    button.addEventListener('click', () => {
      map?.zoomTo(map.getZoom() + Number(button.dataset.mapZoom), {
        duration: reduced.matches ? 0 : 250,
      });
    });
  });
  pitchButton.addEventListener('click', () => {
    if (!map) return;
    const active = pitchButton.getAttribute('aria-pressed') !== 'true';
    pitchButton.setAttribute('aria-pressed', String(active));
    if (map.getLayer('thld-buildings-3d'))
      map.setLayoutProperty('thld-buildings-3d', 'visibility', active ? 'visible' : 'none');
    map.easeTo({ pitch: active ? 58 : 0, bearing: 0, duration: reduced.matches ? 0 : 500 });
  });
  section.querySelector('[data-map-fit]').addEventListener('click', () => {
    citySelect.value = '';
    closePanels();
    filterOptions();
    fit(records);
  });

  async function start() {
    section.dataset.mapState = 'loading';
    try {
      const responses = await Promise.all([
        fetch(section.dataset.locations),
        fetch(section.dataset.projectsSource),
      ]);
      if (responses.some((response) => !response.ok))
        throw new Error('Project locations unavailable');
      const [data, projects] = await Promise.all(responses.map((response) => response.json()));
      const byId = new Map(projects.map((project) => [project.id, project]));
      records = data.locations.map((location) => {
        const project = byId.get(location.id) || {};
        const dates = String(project.yearLabel || project.technicalSpecs?.['Дата сдачи'] || '');
        return {
          ...location,
          cover: project.cover,
          area: project.area,
          roof: project.roof,
          year: [...new Set(dates.match(/\b(?:19|20)\d{2}\b/g) || [])].join('–'),
        };
      });
      section.dataset.mapState = 'assets';
      citySelect.replaceChildren(
        new Option('Вся география', ''),
        ...[...new Set(records.map((record) => record.city).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b, 'ru'))
          .map((city) => new Option(city, city)),
      );
      citySelect.value = defaultCity;
      filterOptions();
      await Promise.all([
        load(section.dataset.mapStyle, 'css'),
        load(section.dataset.mapScript, 'js'),
      ]);
      const initialBounds = boundsFor(visibleRecords());
      map = new maplibregl.Map({
        container: view,
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: defaultCenter,
        zoom: overviewZoom(),
        ...(initialBounds && {
          bounds: initialBounds,
          fitBoundsOptions: { padding: overviewPadding, maxZoom: overviewZoom() },
        }),
        pitch: 0,
        bearing: 0,
        antialias: true,
        attributionControl: true,
        scrollZoom: true,
        cooperativeGestures: !mouse.matches,
        locale: {
          'AttributionControl.ToggleAttribution': 'Источники карты',
          'NavigationControl.ResetBearing': 'Ориентировать на север',
          'CooperativeGesturesHandler.TouchPanBlocker': 'Перемещайте карту двумя пальцами',
        },
      });
      mouse.addEventListener('change', () => {
        if (mouse.matches) map.cooperativeGestures.disable();
        else map.cooperativeGestures.enable();
      });
      map.addControl(
        new maplibregl.NavigationControl({ showZoom: false, visualizePitch: true }),
        'bottom-right',
      );
      map.on('movestart', () => clearTimeout(hoverTimer));
      map.on('moveend', renderMarkers);
      map.on('click', () => closePanels());
      map.on('error', (event) => {
        if (!section.dataset.mapReady) {
          status.hidden = false;
          status.textContent = 'Не удалось загрузить часть карты. Выберите объект в списке.';
        }
        if (event.error?.message) console.warn('Map resource:', event.error.message);
      });
      map.on('load', () => {
        const layers = map.getStyle().layers;
        layers
          .filter(
            (layer) =>
              layer.type === 'symbol' &&
              JSON.stringify(layer.layout?.['text-field'] || '').includes('name'),
          )
          .forEach((layer) => {
            map.setLayoutProperty(layer.id, 'text-field', [
              'coalesce',
              ['get', 'name:ru'],
              ['get', 'name'],
              ['get', 'name:nonlatin'],
              ['get', 'name:latin'],
            ]);
          });
        ['highway_major_casing', 'highway_motorway_casing', 'highway_motorway_bridge_casing']
          .filter((id) => map.getLayer(id))
          .forEach((id) => map.setPaintProperty(id, 'line-color', '#eac774'));
        [
          ['water', '#e1eef5'],
          ['park', '#e9efea'],
          ['landcover_wood', '#e6ece6'],
        ]
          .filter(([id]) => map.getLayer(id))
          .forEach(([id, color]) => map.setPaintProperty(id, 'fill-color', color));
        const symbol = layers.find((layer) => layer.type === 'symbol')?.id;
        map.addSource('thld-buildings', {
          type: 'vector',
          url: 'https://tiles.openfreemap.org/planet',
        });
        map.addLayer(
          {
            id: 'thld-buildings-3d',
            source: 'thld-buildings',
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 14,
            layout: { visibility: 'none' },
            filter: ['!=', ['get', 'hide_3d'], true],
            paint: {
              'fill-extrusion-color': '#b9b5a9',
              'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
              'fill-extrusion-opacity': 0.95,
            },
          },
          symbol,
        );
        status.hidden = true;
        section.dataset.mapReady = 'true';
        section.dataset.mapState = 'ready';
      });
      renderMarkers();
      new ResizeObserver(() => map.resize()).observe(view);
    } catch (error) {
      section.dataset.mapState = 'error';
      status.hidden = false;
      status.textContent =
        'Карта временно недоступна. Выберите объект в списке, чтобы открыть фотографии и адрес.';
      section.querySelectorAll('[data-ui~=company-map__tools] button').forEach((button) => {
        button.disabled = true;
      });
      console.warn('Company map:', error);
    }
  }

  function whenScrollRests(callback) {
    let timer = 0;
    const settle = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        removeEventListener('scroll', settle);
        callback();
      }, 220);
    };
    addEventListener('scroll', settle, { passive: true });
    settle();
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      whenScrollRests(start);
    },
    { rootMargin: '300px 0px' },
  );
  observer.observe(section);
}
