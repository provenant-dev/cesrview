<template>
  <main id="main-content" class="viewer-page">
    <SplitPane>
      <template #source>
        <section id="source-pane" class="source-pane" aria-labelledby="source-heading">
          <form class="source-form" @submit.prevent="processInput">
            <div class="pane-toolbar source-options">
              <h2 id="source-heading">Input</h2>
              <label class="visually-hidden" for="parse-mode">Inspect as</label>
              <select id="parse-mode" v-model="mode" @change="resetOutput">
                <option value="stream">Message stream</option>
                <option value="matter">Matter primitives</option>
                <option value="indexer">Indexed signatures</option>
                <option value="attachments">Attachment groups</option>
              </select>
              <template v-if="mode !== 'stream'">
                <label class="visually-hidden" for="input-domain">Encoding</label>
                <select id="input-domain" v-model="domain" @change="resetOutput">
                  <option value="txt">Text (qb64)</option>
                  <option value="bny">Binary (qb2)</option>
                </select>
                <template v-if="mode === 'attachments'">
                  <label class="visually-hidden" for="table-version">CESR table version</label>
                  <select id="table-version" v-model.number="major" @change="resetOutput">
                    <option :value="1">v1.0</option>
                    <option :value="2">v2.0</option>
                  </select>
                </template>
              </template>
            </div>

            <div class="input-caption">
              <label v-if="!fileBytes" for="input-textarea">{{ loadedExample ? `Example: ${loadedExample.label}` : 'CESR data' }}</label>
              <span v-else>{{ loadedExample ? `Example: ${loadedExample.label}` : fileName }}</span>
              <span class="input-count"><button v-if="fileBytes && fileText !== null" type="button" class="text-button" @click="showHex = !showHex">{{ showHex ? 'Text view' : 'Hex view' }}</button>{{ inputSize.toLocaleString() }} bytes</span>
            </div>
            <p v-if="loadedExample" class="example-description">{{ loadedExample.description }}</p>
            <div class="source-editor">
              <template v-if="fileBytes">
                <LazySourceEditor v-if="fileText !== null && !showHex" :model-value="fileText" readonly
                  :ranges="result?.highlights" :target="sourceTarget" @inspect="processInput" />
                <ByteView v-else :bytes="fileBytes" :target="sourceTarget" />
              </template>
              <LazySourceEditor v-else :model-value="inputData" :ranges="result?.highlights" :target="sourceTarget"
                @update:model-value="editInput" @inspect="processInput" />
            </div>
            <div v-if="sourceTarget" class="source-location" role="status">
              {{ sourceTarget.kind === 'end' ? `End of input at byte ${sourceTarget.start}` : `Bytes ${sourceTarget.start}–${Math.max(sourceTarget.start, sourceTarget.end - 1)}` }}
              <span>Zero-based offsets</span>
              <button type="button" class="text-button" @click="sourceTarget = null">Clear highlight</button>
            </div>

            <div class="source-actions">
              <div class="file-picker">
                <input id="input-file" ref="fileInput" type="file" class="visually-hidden" @change="loadFile">
                <label for="input-file" class="button">{{ loadingFile ? 'Reading…' : 'Open file…' }}</label>
              </div>
              <label for="input-example" class="visually-hidden">Load an example (replaces input)</label>
              <select id="input-example" value="" @change="selectExample">
                <option value="" disabled>Examples…</option>
                <optgroup v-for="group in exampleGroups" :key="group.label" :label="group.label">
                  <option v-for="example in group.examples" :key="example.id" :value="example.id">{{ example.label }}</option>
                </optgroup>
              </select>
              <button type="button" class="text-button" :disabled="!inputData && !fileBytes && !loadingFile" @click="clearInput">Clear</button>
              <button type="submit" class="button button-primary" :disabled="loadingFile || (!inputData && !fileBytes)" title="Inspect (⌘ / Ctrl + Enter)">Inspect</button>
            </div>
          </form>
        </section>
      </template>
      <PreviewField :result="result" :error="error" :error-location="errorLocation" @locate="locateSource" />
    </SplitPane>

    <footer class="viewer-footer">
      <details class="compatibility-note">
        <summary>CESR 1.0 / 2.0</summary>
        <p>KERIpy-compatible tables. Some entries differ from published ToIP tables. This viewer decodes structure; it does not verify signatures, SAIDs, or key event state.</p>
      </details>
      <span>Processed in your browser. No data is uploaded.</span>
    </footer>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue';
import { inspectCesr, describeInspectionError } from '~/lib/cesr.js';
import { readableText } from '~/lib/source-locations.js';
import { CESR_EXAMPLE, CESR_EXAMPLES, exampleInput } from '~/lib/cesr-example.js';

const inputData = ref(CESR_EXAMPLE);
const loadedExample = ref(CESR_EXAMPLES[0]);
const exampleGroups = [...new Set(CESR_EXAMPLES.map(example => example.group))]
  .map(label => ({ label, examples: CESR_EXAMPLES.filter(example => example.group === label) }));
const fileInput = ref(null);
const fileBytes = ref(null);
const fileName = ref('');
const loadingFile = ref(false);
const mode = ref('stream');
const domain = ref('txt');
const major = ref(1);
const result = ref(null);
const error = ref('');
const errorLocation = ref(null);
const sourceTarget = ref(null);
const showHex = ref(false);
const fileText = computed(() => fileBytes.value ? readableText(fileBytes.value) : null);
const inputSize = computed(() => fileBytes.value?.byteLength ?? new TextEncoder().encode(inputData.value).length);
let fileRead = 0;

function resetOutput() {
  result.value = null;
  error.value = '';
  errorLocation.value = null;
  sourceTarget.value = null;
}

function clearFile() {
  fileRead++;
  loadedExample.value = null;
  fileBytes.value = null;
  fileName.value = '';
  loadingFile.value = false;
  if (fileInput.value) fileInput.value.value = '';
  resetOutput();
}

function editInput(value) {
  inputData.value = value;
  clearFile();
}

function locateSource(range) {
  sourceTarget.value = range ? { ...range } : null;
}

function clearInput() {
  clearFile();
  inputData.value = '';
}

function selectExample(event) {
  const example = CESR_EXAMPLES.find(example => example.id === event.target.value);
  if (!example) return;
  clearFile();
  mode.value = example.mode;
  domain.value = example.domain;
  major.value = example.major;
  const input = exampleInput(example);
  if (typeof input === 'string') {
    inputData.value = input;
  } else {
    inputData.value = '';
    fileBytes.value = input;
    fileName.value = `${example.id}.cesr`;
  }
  showHex.value = example.domain === 'bny';
  loadedExample.value = example;
  event.target.value = '';
  processInput();
}

async function loadFile(event) {
  const file = event.target.files?.[0];
  const read = ++fileRead;
  loadedExample.value = null;
  resetOutput();
  fileBytes.value = null;
  fileName.value = '';
  loadingFile.value = false;
  if (!file) return;
  loadingFile.value = true;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (read !== fileRead) return;
    fileBytes.value = bytes;
    fileName.value = file.name;
    showHex.value = false;
    inputData.value = '';
  } catch (cause) {
    if (read === fileRead) error.value = `Could not read file: ${cause.message}`;
  } finally {
    if (read === fileRead) loadingFile.value = false;
  }
}

function processInput() {
  if (loadingFile.value) return;
  resetOutput();
  try {
    if (mode.value !== 'stream' && domain.value === 'bny' && !fileBytes.value) {
      throw new Error('Choose a binary file for qb2 input.');
    }
    result.value = inspectCesr(fileBytes.value ?? inputData.value, {
      mode: mode.value, domain: domain.value, major: major.value,
    });
  } catch (cause) {
    const failure = describeInspectionError(cause, fileBytes.value ?? inputData.value);
    error.value = failure.message;
    errorLocation.value = failure.location;
    sourceTarget.value = failure.location;
  }
}

processInput();
</script>
