function repopulateGpuTypesForPartition() {
  var partitionSelect = document.getElementById('batch_connect_session_context_partition');
  var gpuTypeSelect = document.getElementById('batch_connect_session_context_gpu_type');
  if (!partitionSelect || !gpuTypeSelect) {
    console.warn('[gpu] repopulate: missing partition or gpu select element');
    return;
  }

  var selected = partitionSelect.value;
  // Read from select's dataset (preferred) or attribute (fallback)
  var datasetValue = (gpuTypeSelect.dataset && gpuTypeSelect.dataset.partitionOptions) ? gpuTypeSelect.dataset.partitionOptions : null;
  var attrValue = datasetValue ? null : gpuTypeSelect.getAttribute('data-partition-options');
  var optionsSource = datasetValue ? 'select-dataset' : (attrValue ? 'select-attribute' : null);
  var optionsJson = datasetValue || attrValue;
  if (!optionsJson) {
    console.warn('[gpu] repopulate: no data-partition-options found (attr or dataset)');
    return; }

  var map;
  try {
    map = JSON.parse(optionsJson);
  } catch (e) {
    console.error('[gpu] repopulate: failed to parse data-partition-options JSON', e);
    return;
  }
  var usedKey = (map && Object.prototype.hasOwnProperty.call(map, selected)) ? selected : 'all';
  var opts = map[usedKey] || [];
  try {
    console.log('[gpu] repopulate: start', {
      selectedPartition: selected,
      source: optionsSource,
      usedKey: usedKey,
      mapKeys: map ? Object.keys(map) : [],
      rawLength: (map[usedKey] || []).length
    });
  } catch (_) {}

  // Preserve current value if possible
  var previousValue = gpuTypeSelect.value;
  try { console.log('[gpu] repopulate: previousValue', previousValue); } catch (_) {}

  // Remove existing options
  while (gpuTypeSelect.firstChild) {
    gpuTypeSelect.removeChild(gpuTypeSelect.firstChild);
  }

  // Rebuild options: each entry is [label, value]
  opts.forEach(function (pair) {
    var label = pair[0];
    var value = pair[1];
    var opt = document.createElement('option');
    opt.textContent = label;
    opt.value = value;
    gpuTypeSelect.appendChild(opt);
  });

  try {
    console.log('[gpu] repopulate: rebuilt options', Array.from(gpuTypeSelect.options).map(function (o) { return [o.text, o.value]; }));
  } catch (_) {}

  // Try to restore previous selection or default to first option
  if (previousValue) {
    gpuTypeSelect.value = previousValue;
  }
  if (!gpuTypeSelect.value && gpuTypeSelect.options.length > 0) {
    gpuTypeSelect.selectedIndex = 0;
  }
  try { console.log('[gpu] repopulate: final selection', gpuTypeSelect.value || '(none)'); } catch (_) {}
}

function updateCoresForPartition() {
  var partitionSelect = document.getElementById('batch_connect_session_context_partition');
  var coresInput = document.getElementById('batch_connect_session_context_num_cores');
  
  if (!partitionSelect || !coresInput) {
    console.warn('[cores] update: missing partition or cores input element');
    return;
  }

  var selected = partitionSelect.value;
  // Read partition_max_cores data from the cores input's dataset or attribute
  var datasetValue = (coresInput.dataset && coresInput.dataset.partitionMaxCores) ? coresInput.dataset.partitionMaxCores : null;
  var attrValue = datasetValue ? null : coresInput.getAttribute('data-partition-max-cores');
  var optionsSource = datasetValue ? 'input-dataset' : (attrValue ? 'input-attribute' : null);
  var optionsJson = datasetValue || attrValue;
  
  if (!optionsJson) {
    console.warn('[cores] update: no data-partition-max-cores found');
    return;
  }

  var map;
  try {
    map = JSON.parse(optionsJson);
  } catch (e) {
    console.error('[cores] update: failed to parse data-partition-max-cores JSON', e);
    return;
  }

  var usedKey = (map && Object.prototype.hasOwnProperty.call(map, selected)) ? selected : 'all';
  var maxCores = map[usedKey];
  
  try {
    console.log('[cores] update: start', {
      selectedPartition: selected,
      source: optionsSource,
      usedKey: usedKey,
      mapKeys: map ? Object.keys(map) : [],
      maxCores: maxCores
    });
  } catch (_) {}

  if (!maxCores || maxCores <= 0) {
    console.warn('[cores] update: invalid max cores for partition', selected);
    return;
  }

  var currentValue = parseInt(coresInput.value) || 1;

  // Update max attribute
  coresInput.setAttribute('max', maxCores);
  
  // If current value exceeds new max, adjust it
  if (currentValue > maxCores) {
    coresInput.value = maxCores;
    try { console.log('[cores] update: adjusted value from', currentValue, 'to', maxCores); } catch (_) {}
  }

  // Update help text to show partition-specific max
  var helpText = coresInput.parentElement.querySelector('.form-text, .help-block');
  if (helpText) {
    helpText.textContent = 'Number of CPU cores/threads to allocate. Max varies by partition (detected: ' + maxCores + ' cores).';
    try { console.log('[cores] update: updated help text to show', maxCores, 'cores'); } catch (_) {}
  }
  
  try { console.log('[cores] update: final max =', maxCores, ', value =', coresInput.value); } catch (_) {}
}

document.addEventListener('DOMContentLoaded', function () {
  try { console.log('[gpu] DOMContentLoaded: initializing GPU options'); } catch (_) {}
  repopulateGpuTypesForPartition();
  updateCoresForPartition();
  
  var partitionSelect = document.getElementById('batch_connect_session_context_partition');
  if (partitionSelect) {
    partitionSelect.addEventListener('change', function () {
      try { console.log('[gpu] partition change ->', partitionSelect.value); } catch (_) {}
      repopulateGpuTypesForPartition();
      updateCoresForPartition();
    });
  }
});


