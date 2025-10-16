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
    helpText.textContent = 'Number of CPU cores/threads to allocate. Max varies by partition (Maximum: ' + maxCores + ' cores).';
    try { console.log('[cores] update: updated help text to show', maxCores, 'cores'); } catch (_) {}
  }
  
  try { console.log('[cores] update: final max =', maxCores, ', value =', coresInput.value); } catch (_) {}
}

function updateMemoryForPartition() {
  var partitionSelect = document.getElementById('batch_connect_session_context_partition');
  var memoryInput = document.getElementById('batch_connect_session_context_num_memory');
  
  if (!partitionSelect || !memoryInput) {
    console.warn('[memory] update: missing partition or memory input element');
    return;
  }

  var selected = partitionSelect.value;
  // Read partition_max_memory data from the memory input's dataset or attribute
  var datasetValue = (memoryInput.dataset && memoryInput.dataset.partitionMaxMemory) ? memoryInput.dataset.partitionMaxMemory : null;
  var attrValue = datasetValue ? null : memoryInput.getAttribute('data-partition-max-memory');
  var optionsSource = datasetValue ? 'input-dataset' : (attrValue ? 'input-attribute' : null);
  var optionsJson = datasetValue || attrValue;
  
  if (!optionsJson) {
    console.warn('[memory] update: no data-partition-max-memory found');
    return;
  }

  var map;
  try {
    map = JSON.parse(optionsJson);
  } catch (e) {
    console.error('[memory] update: failed to parse data-partition-max-memory JSON', e);
    return;
  }

  var usedKey = (map && Object.prototype.hasOwnProperty.call(map, selected)) ? selected : 'all';
  var maxMemoryMB = map[usedKey];
  
  if (!maxMemoryMB || maxMemoryMB <= 0) {
    console.warn('[memory] update: invalid max memory for partition', selected);
    return;
  }

  // Convert MB to GB and round to nearest whole number (no decimals)
  var maxMemoryGB = Math.round(maxMemoryMB / 1024.0);
  
  try {
    console.log('[memory] update: start', {
      selectedPartition: selected,
      source: optionsSource,
      usedKey: usedKey,
      mapKeys: map ? Object.keys(map) : [],
      maxMemoryMB: maxMemoryMB,
      maxMemoryGB: maxMemoryGB
    });
  } catch (_) {}

  var currentValue = parseFloat(memoryInput.value) || 4;

  // Update max attribute
  memoryInput.setAttribute('max', maxMemoryGB);
  
  // If current value exceeds new max, adjust it
  if (currentValue > maxMemoryGB) {
    memoryInput.value = maxMemoryGB;
    try { console.log('[memory] update: adjusted value from', currentValue, 'to', maxMemoryGB); } catch (_) {}
  }

  // Update help text to show partition-specific max
  var helpText = memoryInput.parentElement.querySelector('.form-text, .help-block');
  if (helpText) {
    helpText.textContent = 'Amount of memory to allocate per node in GB. Max varies by partition (Maximum: ' + maxMemoryGB + ' GB).';
    try { console.log('[memory] update: updated help text to show', maxMemoryGB, 'GB'); } catch (_) {}
  }
  
  try { console.log('[memory] update: final max =', maxMemoryGB, 'GB, value =', memoryInput.value); } catch (_) {}
}

document.addEventListener('DOMContentLoaded', function () {
  try { console.log('[gpu] DOMContentLoaded: initializing GPU options, cores, and memory'); } catch (_) {}
  repopulateGpuTypesForPartition();
  updateCoresForPartition();
  updateMemoryForPartition();
  
  var partitionSelect = document.getElementById('batch_connect_session_context_partition');
  if (partitionSelect) {
    partitionSelect.addEventListener('change', function () {
      try { console.log('[partition] change ->', partitionSelect.value); } catch (_) {}
      repopulateGpuTypesForPartition();
      updateCoresForPartition();
      updateMemoryForPartition();
    });
  }
});


