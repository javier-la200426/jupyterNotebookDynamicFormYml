## Adapting your OnDemand app to dynamic GPU/partition-aware resources

These steps apply to any OOD Batch Connect app, but here I will reference the jupyter app as an example.
This guide explains how to update an existing Open OnDemand (OOD) Batch Connect app to use dynamic, Slurm-driven resource options:
- **Auto-detected GPU types and sizes** (e.g., A100 40/80GB) per partition
- **Partition-aware max CPU cores, memory, and time limits**
- **Frontend auto-updates** of fields when partition/GPU changes
- **Warnings when a GPU type is currently unavailable** (all nodes down/drained)

It uses three files from this example app:
- `partials/gpu_discovery.erb` (new): discovers resources from Slurm and generates dynamic field YAML.
- `form.js` (new): updates the UI client-side using data from the generated fields.
- `form.yml.erb` (updated): integrates the dynamic partial and JS, and shows how to structure the form.

---

### What changed vs the original
Original (static) file: `ood_v4_tufts_dev/tufts/jupyter/form.yml.erb`

New/updated files:
- `javi_jupyter/partials/gpu_discovery.erb`
- `javi_jupyter/form.js`
- `javi_jupyter/form.yml.erb`

Key capabilities introduced:
- Runs `scontrol show node --oneliner` and `sinfo -o "%P %l"` to parse:
  - GPU presence/type (`Gres=gpu:...`) and A100 size hints from features
  - Per-partition max cores/memory (from node attributes) and time limits
  - Node availability to identify temporarily unavailable GPU types
- Generates the field YAML for `gpu_type`, `num_cores`, `num_memory`, `bc_num_hours`, embedding JSON data in `data-*` attributes for the frontend.
- `form.js` reads those JSON blobs to:
  - Repopulate GPU options when the partition changes
  - Adjust max cores/memory/hours and help text live
  - Show/hide a warning banner if the selected GPU type is currently unavailable

---

## Migration steps
Follow these steps to adapt your existing app.

### 1) Copy files into your app
Place these in your app directory:
- Copy `javi_jupyter/partials/gpu_discovery.erb` → `your_app/partials/gpu_discovery.erb`
- Copy `javi_jupyter/form.js` → `your_app/form.js`

Optional: Use the provided `javi_jupyter/form.yml.erb` as a starting point (rename to your app’s `form.yml.erb`) and tweak labels as needed.

### 2) Enable dynamic JS in your form
Ensure your `form.yml.erb` contains:
```yaml
bc_dynamic_js: true
```

### 3) Include the dynamic GPU discovery partial
Near the top of `form.yml.erb`, add:
```erb
<%= ERB.new(File.read(File.expand_path('partials/gpu_discovery.erb', __dir__))).result(binding) %>
```
This loads the Ruby helpers and computes the dynamic data before fields are rendered.

### 4) Replace static resource fields with dynamic ones
Remove any static includes for `num_cores`, `num_memory`, `gpu_type`, and `bc_num_hours`. Then insert these where your attributes are defined:
```erb
<%= generate_num_cores_field.indent(2) %>
<%= generate_num_memory_field.indent(2) %>
<%= generate_gpu_type_field.indent(2) %>
<%= generate_num_hours_field.indent(2) %>
```
- The generated `gpu_type` field references `javascript: "form.js"`, so make sure `form.js` is present at the app root.

If you rely on a shared partition field, include it as well (or keep your existing partition field):
```erb
<%= File.read("/etc/ood/config/apps/dashboard/batch_connect/partials/all_partition.yml").indent(2) %>
```

### 5) Update the form order
Ensure your `form:` section includes, in a sensible order:
```yaml
form:
  - partition
  - bc_num_hours
  - gpu_type
  - num_cores
  - num_memory
  # ... your other fields (mode, working_directory, module, etc.)
```
Order matters for a good UX because choices in `partition` and `gpu_type` drive the others.

### 6) Verify Slurm command availability
The web host rendering the form must be able to run:
- `scontrol show node --oneliner`
- `sinfo -o "%P %l"`

If these commands are not in `PATH` for the OOD app runtime, adjust PATH or provide absolute paths. The code fails gracefully and shows minimal defaults if discovery fails.

### 7) Optional: Notice banner and debug logging
- The example `form.yml.erb` includes a dismissible notice. Keep or remove as you like.
- A small debug logger writes to `$HOME/javi_gpu_debug.log`. You can remove that `begin ... rescue` block or change the file path.

---

## How it works (backend)
`partials/gpu_discovery.erb`:
- Uses Ruby and `Open3.capture2` to run Slurm commands, then parses:
  - GPU types per node (`Gres=gpu:TYPE`), A100 sizes from features
  - Per-partition max schedulable cores (`CPUEfctv`) and memory (`CfgTRES: mem=`)
  - Partition time limits via `sinfo -o "%P %l"`
  - Node availability by state to compute `unavailable_gpus`
- Produces four field definitions with JSON embedded in `data-*` attributes:
  - `gpu_type` includes:
    - `data-partition-options`: map of partition → GPU options
    - `data-unavailable-gpus`: map of temporarily unavailable GPU types
  - `num_cores` includes:
    - `data-partition-gpu-max-cores`: partition+gpu → max cores
  - `num_memory` includes:
    - `data-partition-gpu-max-memory`: partition+gpu → max memory (MB)
  - `bc_num_hours` includes:
    - `data-partition-max-hours`: partition → max hours
- Provides sensible global fallbacks if partition-specific data isn’t available.

Customization points in `gpu_discovery.erb`:
- `@label_map`: friendly names for GPU types
- `order`: preferred display order of GPU types
- Unavailable GPU test hook (commented) to simulate a warning during testing

---

## How it works (frontend)
`form.js` wires up event handlers and on-load initialization:
- On load and when `partition`/`gpu_type` change, it:
  - Rebuilds GPU options for the selected partition
  - Sets the max/value/help text for cores, memory (GB), and hours
  - Shows a red banner if the selected GPU type is currently unavailable
- Reads JSON from the fields’ `data-*` attributes and logs to the console for troubleshooting.

Requirements:
- `bc_dynamic_js: true` in `form.yml.erb`
- `gpu_type` field must include `javascript: "form.js"` (auto-included by the generator)

---

## Testing checklist
- Open the app form and check the browser console for `[gpu]`, `[cores]`, `[memory]`, `[hours]`, `[gpu-warning]` logs.
- Change `partition` and verify:
  - `gpu_type` options refresh and include `any` and the detected types
  - `num_cores`, `num_memory`, `bc_num_hours` update their max and help text
- Select a specific GPU type; if it’s marked unavailable, a red warning appears.
- If discovery fails, the form falls back to minimal defaults and displays a help message.

---

## Troubleshooting
- **No GPU options or parse errors in console**: Ensure the generated fields are present and their `data-*` attributes contain valid JSON (not HTML-escaped beyond quotes). Keep the JSON wrapped in single quotes in YAML.
- **Slurm commands not found**: Ensure `scontrol` and `sinfo` are in PATH for the OOD app process, or edit the commands to absolute paths.
- **Values not updating**: Confirm `bc_dynamic_js: true`, `form.js` is in the app root, and that the `gpu_type` field was generated by the ERB helper (or includes the same `data-*` attributes).
- **Excessive logging**: Remove or edit the debug logging block in `form.yml.erb` and the `console.log` calls in `form.js` as desired.

---

## Minimal integration template
Here’s a compact template for integrating into an existing app while keeping your own fields:

```erb
---
cluster: "pax"

bc_dynamic_js: true

<%= ERB.new(File.read(File.expand_path('partials/gpu_discovery.erb', __dir__))).result(binding) %>

attributes:
  # Your existing attributes ...

  # Partition field (or use your own variant)
<%= File.read("/etc/ood/config/apps/dashboard/batch_connect/partials/all_partition.yml").indent(2) %>

  # Dynamic resource fields generated by the partial
<%= generate_num_cores_field.indent(2) %>
<%= generate_num_memory_field.indent(2) %>
<%= generate_gpu_type_field.indent(2) %>
<%= generate_num_hours_field.indent(2) %>

form:
  - partition
  - bc_num_hours
  - gpu_type
  - num_cores
  - num_memory
  # ... your remaining fields
```

Place `form.js` at the app root. The generated `gpu_type` field will load it automatically.

---

## Notes
- If you maintain multiple apps, factor `partials/gpu_discovery.erb` into a shared location and reference it consistently.
- The time limit parser handles `D-HH:MM:SS`, `HH:MM:SS`, `MM:SS`, and `infinite` (capped to 720 hours by default). Adjust in the partial if your site has different semantics.
- Memory is tracked in MB internally and displayed/limited in whole GB.

---

## License/Attribution
This documentation and implementation are provided as an example to help OOD app authors adopt dynamic, Slurm-aware forms. Adapt as needed for your site policies.


