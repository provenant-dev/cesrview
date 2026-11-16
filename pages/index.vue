<template>
  <div class="container mt-5">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
      <label for="input-textarea" class="form-label mb-0">Enter your CESR data here…</label>
      <button type="button" class="btn btn-outline-secondary btn-sm" @click="loadExample">Load example</button>
    </div>
    <p id="example-description" class="small text-muted">Try the example KERI inception event below, then select Process to inspect its identifier and keys.</p>
    <textarea id="input-textarea" v-model="inputData" class="form-control" rows="8"
      placeholder="CESR message stream…" aria-describedby="example-description" @input="clearFile" />
    <div class="row g-3 mt-1">
      <div class="col-md-6">
        <label for="input-file" class="form-label">Or open a text or binary file</label>
        <input id="input-file" ref="fileInput" type="file" class="form-control" @change="loadFile">
        <small class="text-muted">Files are processed locally in your browser.</small>
      </div>
      <div class="col-md-6">
        <label for="parse-mode" class="form-label">Inspect as</label>
        <select id="parse-mode" v-model="mode" class="form-select" @change="resetOutput">
          <option value="stream">Message stream (detect encoding)</option>
          <option value="matter">Matter primitives</option>
          <option value="indexer">Indexed signatures</option>
          <option value="attachments">Attachment groups</option>
        </select>
      </div>
      <template v-if="mode !== 'stream'">
        <div class="col-md-6">
          <label for="input-domain" class="form-label">Encoding</label>
          <select id="input-domain" v-model="domain" class="form-select" @change="resetOutput">
            <option value="txt">CESR text (qb64)</option>
            <option value="bny">CESR binary (qb2 file)</option>
          </select>
        </div>
        <div v-if="mode === 'attachments'" class="col-md-6">
          <label for="table-version" class="form-label">CESR table version</label>
          <select id="table-version" v-model.number="major" class="form-select" @change="resetOutput">
            <option :value="1">1.0</option>
            <option :value="2">2.0</option>
          </select>
        </div>
      </template>
    </div>
    <div class="my-4 text-center">
      <button class="btn btn-success btn-lg" :disabled="loadingFile" @click="processInput">Process</button>
    </div>
    <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
    <p v-if="result" class="text-muted">{{ result.byteLength }} input bytes · Parsed structure; signatures and SAIDs are not verified.</p>
    <p class="small text-muted">Uses KERIpy-compatible CESR 1.0 / 2.0 tables. These differ from some published ToIP table entries.</p>
    <PreviewField :result="result" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { inspectCesr } from '~/lib/cesr.js';
import { CESR_EXAMPLE } from '~/lib/cesr-example.js';

const inputData = ref(CESR_EXAMPLE);
const fileInput = ref(null);
const fileBytes = ref(null);
const loadingFile = ref(false);
const mode = ref('stream');
const domain = ref('txt');
const major = ref(1);
const result = ref(null);
const error = ref('');
let fileRead = 0;

function resetOutput() {
  result.value = null;
  error.value = '';
}

function clearFile() {
  fileRead++;
  fileBytes.value = null;
  loadingFile.value = false;
  if (fileInput.value) fileInput.value.value = '';
  resetOutput();
}

function loadExample() {
  clearFile();
  mode.value = 'stream';
  domain.value = 'txt';
  major.value = 1;
  inputData.value = CESR_EXAMPLE;
}

async function loadFile(event) {
  const file = event.target.files?.[0];
  const read = ++fileRead;
  resetOutput();
  fileBytes.value = null;
  loadingFile.value = false;
  if (!file) return;
  loadingFile.value = true;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (read !== fileRead) return;
    fileBytes.value = bytes;
    inputData.value = '';
  } catch (cause) {
    if (read === fileRead) error.value = `Could not read file: ${cause.message}`;
  } finally {
    if (read === fileRead) loadingFile.value = false;
  }
}

function processInput() {
  resetOutput();
  try {
    if (mode.value !== 'stream' && domain.value === 'bny' && !fileBytes.value) {
      throw new Error('Choose a binary file for qb2 input.');
    }
    result.value = inspectCesr(fileBytes.value ?? inputData.value, {
      mode: mode.value, domain: domain.value, major: major.value,
    });
  } catch (cause) {
    error.value = `Could not parse input: ${cause.message ?? String(cause)}`;
  }
}
</script>
