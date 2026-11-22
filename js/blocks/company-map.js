import { loadAsset as load } from '../lib/assets.js';
import initMapLayout from './company-map-layout.js';
import satelliteStyle from './company-satellite-style.js';

export default function init(section) {
  initMapLayout(section);
  const view = section.querySelector('[data-map-view]');
  const status = section.querySelector('[data-map-status]');
  const card = section.querySelector('[data-map-card]');
  const list = section.querySelector('[data-map-list]');
  const listItems = section.querySelector('[data-map-list-items]');
  const itemTemplate = section.querySelector('[data-map-list-template]');
  const pitchButton = section.querySelector('[data-map-pitch]');
  const fitButton = section.querySelector('[data-map-fit]');
  const mapboxToken = section.dataset.mapboxToken?.trim() || '';
  const useMapbox = mapboxToken.startsWith('pk.');
  const mapboxCdn = 'https://api.mapbox.com/mapbox-gl-js/v3.35.0';
  const scriptUrl = useMapbox ? mapboxCdn + '/mapbox-gl.js' : section.dataset.mapScript;
  const cssUrl = useMapbox ? mapboxCdn + '/mapbox-gl.css' : section.dataset.mapStyle;
  section.querySelector('.company-map__provider').hidden = useMapbox;
  const perspectivePitch = useMapbox ? 52 : 45;
  const cameraPitch = () =>
    pitchButton.getAttribute('aria-pressed') === 'true' ? perspectivePitch : 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 1099px)');
  const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const defaultCenter = [61.40645, 55.16246];
  const placeholder = 'icons/image-placeholder.svg';
  let map;
  let mapSdk;
  let records = [];
  let markers = [];
  let selected = '';
  let activeGroup = null;
  let opener = null;
  let cardOpener = null;
  let previewGroup = null;
  let pendingPreview = null;
  let previewSwitchTimer;
  let previewCloseTimer;
  let gestureHintTimer = 0;
  section.dataset.mapState = 'waiting';

  const preload = () => {
    load(cssUrl, 'css').catch(() => {});
    load(scriptUrl, 'js').catch(() => {});
  };
  const preloadObserver = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    preloadObserver.disconnect();
    // On touch screens, let the idle-start path load and execute MapLibre after the swipe.
    if (!matchMedia('(hover: none) and (pointer: coarse)').matches) preload();
  }, { rootMargin: '1000px 0px' });
  preloadObserver.observe(section);

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
  }

  function cancelPreviewSwitch() {
    clearTimeout(previewSwitchTimer);
    pendingPreview = null;
  }

  function previewMarker(group) {
    cancelPreviewSwitch();
    clearTimeout(previewCloseTimer);
    previewGroup = group;
    showGroup(group);
  }

  function waitForHover(group) {
    pendingPreview = group;
    clearTimeout(previewSwitchTimer);
    previewSwitchTimer = setTimeout(() => {
      if (group.button.isConnected && group.button.matches(':hover')) previewMarker(group);
      else cancelPreviewSwitch();
    }, 450);
  }

  function endPreview() {
    cancelPreviewSwitch();
    clearTimeout(previewCloseTimer);
    previewGroup = null;
  }

  function schedulePreviewClose() {
    if (!previewGroup) return;
    clearTimeout(previewCloseTimer);
    // Allow the pointer to cross the map from the marker to the list.
    previewCloseTimer = setTimeout(closePanels, 2000);
  }

  function closePanels(restoreFocus = false) {
    endPreview();
    selected = '';
    activeGroup = null;
    card.hidden = true;
    updateSelection();
    if (restoreFocus && opener?.isConnected && !opener.hidden)
      opener.focus({ preventScroll: true });
  }

  function closeCard(restoreFocus = false) {
    selected = '';
    card.hidden = true;
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

  function showProject(id, { fromList = false, trigger = null, focus = false } = {}) {
    const record = records.find((item) => item.id === id);
    if (!record) return;
    endPreview();
    if (!fromList) {
      activeGroup = null;
      opener = trigger;
    }
    cardOpener = trigger;
    selected = id;
    setImage(card.querySelector('[data-map-card-image]'), record);
    card.querySelector('[data-map-card-title]').textContent = record.title;
    card.querySelector('[data-map-card-address]').textContent =
      record.mapAddress || record.address || record.city || 'Адрес не указан';
    setFact('area', record.area);
    setFact('year', record.year);
    setFact('roof', record.roof);
    card.querySelector('[data-map-card-link]').href = `objects/${record.id}.html`;
    card.hidden = false;
    card.querySelector('.company-map__card-content').scrollTop = 0;
    updateSelection();
    if (focus) card.querySelector('[data-map-card-close]').focus({ preventScroll: true });
  }

  function showGroup(group, focus = false) {
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
    const zoom = map.getZoom();
    records
      .filter((record) => record.coordinates)
      .forEach((record) => {
        const key = record.coordinates.map((value) => value.toFixed(6)).join(',');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(record);
      });
    // Близкие точки объединяются по экранному расстоянию и разделяются при зуме.
    // Координаты объектов остаются исходными; метка группы стоит на первой точке.
    const clusters = [];
    groups.forEach((items) => {
      const point = map.project(items[0].coordinates);
      if (zoom >= 16 && items.length > 1) {
        // Экранные смещения раскрывают общую точку, сохраняя координаты из каталога.
        const radius = Math.max(42, 34 / Math.sin(Math.PI / items.length));
        items.forEach((record, index) => {
          const angle = 2 * Math.PI * index / items.length - Math.PI / 2;
          const offset = [Math.cos(angle) * radius, Math.sin(angle) * radius];
          clusters.push({ records: [record], offset });
        });
        return;
      }
      const nearby = zoom < 16 && clusters.find((cluster) => point.dist(cluster.point) < 58);
      if (nearby) nearby.records.push(...items);
      else clusters.push({ point, records: [...items] });
    });
    clusters.forEach(({ records: items, offset }) => {
      const key = items.map((record) => record.id).join('|');
      const existing = previous.get(key);
      if (existing) {
        previous.delete(key);
        next.push(existing);
        return;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'button'); // Prevent the map SDK's default marker role of img.
      button.className = 'company-map-marker';
      if (offset) button.classList.add('company-map-marker--spread');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', items.length > 1 ? list.id : `${list.id} ${card.id}`);
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
        if (event.pointerType !== 'mouse' || event.buttons || compact.matches) return;
        clearTimeout(previewCloseTimer);
        if ((!activeGroup && !selected) || previewGroup === group) previewMarker(group);
        else waitForHover(group);
      });
      button.addEventListener('pointerleave', () => {
        if (pendingPreview === group) cancelPreviewSwitch();
        schedulePreviewClose();
      });
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (items.length > 1 && event.detail && previewGroup === group && event.pointerType === 'mouse') return;
        endPreview();
        openMarker(group, event.detail === 0);
      });
      group.marker = new mapSdk.Marker({ element: button, anchor: offset ? 'center' : 'bottom', offset })
        .setLngLat(items[0].coordinates)
        .addTo(map);
      next.push(group);
    });
    if (activeGroup && previous.has(activeGroup.key)) {
      if (selected) activeGroup = null;
      else closePanels();
    }
    previous.forEach((group) => group.marker.remove());
    markers = next;
    if (opener && !opener.isConnected) {
      const id = selected || activeGroup?.records[0].id;
      opener =
        markers.find((group) => group.records.some((record) => record.id === id))?.button ||
        fitButton;
    }
    updateSelection();
  }

  function boundsFor(items) {
    const points = items.filter((record) => record.coordinates);
    if (!points.length) return null;
    const bounds = new mapSdk.LngLatBounds();
    points.forEach((record) => bounds.extend(record.coordinates));
    return bounds;
  }

  function fit(items) {
    if (!map) return;
    const bounds = boundsFor(items);
    if (!bounds) return;
    map.fitBounds(bounds, {
      padding: 70,
      maxZoom: 12,
      pitch: cameraPitch(),
      bearing: 0,
      duration: reduced.matches ? 0 : 600,
    });
  }

  function initWheelZoom() {
    const stage = view.parentElement;
    const hint = 'Нажмите на карту, чтобы менять масштаб колёсиком';
    const activeHint = 'Колёсико меняет масштаб. Esc возвращает прокрутку страницы';
    let active = false;

    function sync() {
      if (!map) return;
      if (active) {
        map.cooperativeGestures?.disable();
        map.scrollZoom.enable();
      } else {
        map.scrollZoom.disable();
        map.cooperativeGestures?.enable();
      }
      map.getCanvas().title = active ? activeHint : hint;
    }

    function release() {
      if (!active) return;
      active = false;
      sync();
    }
    stage.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch' || event.button !== 0 || active) return;
      if (event.target !== stage &&
          !event.target.closest('[data-map-view], .company-map__tools, [data-map-status]')) return;
      active = true;
      sync();
    }, true);
    stage.addEventListener('pointerleave', release);
    document.addEventListener('focusin', (event) => {
      if (!stage.contains(event.target)) release();
    });
    document.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch' || !stage.contains(event.target)) release();
    }, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') release();
    });
    window.addEventListener('blur', release);
    return sync;
  }

  const syncWheelZoom = initWheelZoom();

  view.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || event.buttons) return;
    if (pendingPreview) waitForHover(pendingPreview);
    // Keep the current list reachable even on a slow trip across a wide map.
    if (previewGroup && event.movementX < 0 && !previewGroup.button.contains(event.target)) {
      schedulePreviewClose();
    }
  });
  list.addEventListener('pointerenter', () => {
    cancelPreviewSwitch();
    clearTimeout(previewCloseTimer);
  });
  list.addEventListener('pointerleave', schedulePreviewClose);
  list.addEventListener('focusin', endPreview);
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
    if (!useMapbox && map.getLayer('thld-buildings-3d'))
      map.setLayoutProperty('thld-buildings-3d', 'visibility', active ? 'visible' : 'none');
    map.easeTo({ pitch: cameraPitch(), bearing: 0, duration: reduced.matches ? 0 : 500 });
  });
  fitButton.addEventListener('click', () => {
    closePanels();
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
          coordinates: location.precision === 'city' && location.displayCoordinates
            ? location.displayCoordinates
            : location.coordinates,
          cover: project.cover,
          area: project.area,
          roof: project.roof,
          year: [...new Set(dates.match(/\b(?:19|20)\d{2}\b/g) || [])].join('–'),
        };
      });
      section.dataset.mapState = 'assets';
      if (touch) {
        // Download first, execute only after a pause. Otherwise a slow response
        // can parse MapLibre in the middle of the next swipe.
        const script = await fetch(scriptUrl, { cache: 'force-cache' });
        if (!script.ok) throw new Error('Map library unavailable');
        await script.arrayBuffer();
        await new Promise(whenScrollRests);
      }
      await Promise.all([
        load(cssUrl, 'css'),
        load(scriptUrl, 'js'),
      ]);
      if (touch) await new Promise(whenScrollRests);
      // Match the city overview at 1792px; keep Chelyabinsk legible on narrow screens.
      const openingZoom = Math.max(10.2, 10.87 + Math.log2(view.clientWidth / 1792));
      mapSdk = useMapbox ? window.mapboxgl : window.maplibregl;
      map = new mapSdk.Map({
        container: view,
        ...(useMapbox ? {
          accessToken: mapboxToken,
          style: satelliteStyle(mapboxToken),
        } : { style: 'data/company-map-style.json?v=20261122-1' }),
        center: defaultCenter,
        zoom: openingZoom,
        pitch: cameraPitch(),
        bearing: 0,
        antialias: true,
        attributionControl: useMapbox ? true : { compact: false },
        scrollZoom: false,
        cooperativeGestures: useMapbox ? touch : true,
        locale: {
          'AttributionControl.ToggleAttribution': 'Источники карты',
          'NavigationControl.ResetBearing': 'Ориентировать на север',
          'CooperativeGesturesHandler.WindowsHelpText': 'Нажмите на карту, чтобы менять масштаб колёсиком',
          'CooperativeGesturesHandler.MacHelpText': 'Нажмите на карту, чтобы менять масштаб колёсиком',
          'CooperativeGesturesHandler.MobileHelpText': 'Перемещайте карту двумя пальцами',
        },
      });
      syncWheelZoom();
      map.once('style.load', () => {
        if (!useMapbox && pitchButton.getAttribute('aria-pressed') !== 'true')
          map.setLayoutProperty('thld-buildings-3d', 'visibility', 'none');
      });
      map.addControl(
        new mapSdk.NavigationControl({ showZoom: false, visualizePitch: true }),
        'bottom-right',
      );
      view.querySelector('.maplibregl-ctrl-compass, .mapboxgl-ctrl-compass')?.classList.add('icon-btn');
      map.on('cooperativegestureprevented', () => {
        clearTimeout(gestureHintTimer);
        view.classList.add('company-map__canvas--gesture-hint');
        gestureHintTimer = setTimeout(() => {
          view.classList.remove('company-map__canvas--gesture-hint');
        }, 2000);
      });
      map.on('moveend', renderMarkers);
      map.on('click', () => closePanels());
      map.on('error', (event) => {
        if (!section.dataset.mapReady) {
          section.dataset.mapState = 'partial';
          status.hidden = false;
          status.textContent = 'Не удалось загрузить часть карты. Выберите объект в списке.';
        }
        console.warn('Map resource unavailable', event.error?.status || '');
      });
      map.on('load', () => whenScrollRests(() => {
        status.hidden = true;
        section.dataset.mapReady = 'true';
        section.dataset.mapState = 'ready';
      }));
      renderMarkers();
      // MapLibre already observes its container. A second synchronous resize
      // observer creates a feedback loop in WebKit when the viewport changes.
    } catch (error) {
      section.dataset.mapState = 'error';
      status.hidden = false;
      status.textContent =
        'Карта временно недоступна. Попробуйте обновить страницу.';
      section.querySelectorAll('[data-ui~=company-map__tools] button').forEach((button) => {
        button.disabled = true;
      });
      console.warn('Company map:', error);
    }
  }

  function whenScrollRests(callback) {
    let timer = 0;
    let visible = !touch;
    let held = false;
    const events = ['scroll', 'touchmove', 'touchend', 'touchcancel'];
    const hold = () => { held = true; clearTimeout(timer); };
    const release = () => { held = false; settle(); };
    const settle = () => {
      clearTimeout(timer);
      if (!visible || held || document.hidden) return;
      timer = setTimeout(() => {
        events.forEach((event) => removeEventListener(event, settle));
        removeEventListener('touchstart', hold);
        removeEventListener('touchend', release);
        removeEventListener('touchcancel', release);
        document.removeEventListener('visibilitychange', settle);
        visibility?.disconnect();
        callback();
      }, touch ? 350 : 220);
    };
    const visibility = touch ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      settle();
    }) : null;
    visibility?.observe(section);
    events.forEach((event) => addEventListener(event, settle, { passive: true }));
    addEventListener('touchstart', hold, { passive: true });
    addEventListener('touchend', release, { passive: true });
    addEventListener('touchcancel', release, { passive: true });
    document.addEventListener('visibilitychange', settle);
    settle();
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      whenScrollRests(start);
    },
    { rootMargin: touch ? '0px' : '300px 0px' },
  );
  observer.observe(section);
}
