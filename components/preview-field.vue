<template>
  <div>
    <div class="row">
      <div class="col-md-8 my-2">
        <div class="output-container">
          {{ outputData? '':'The output will be shown here...' }}
          <div v-html="outputData" @click="clickOnOutput"></div>
        </div>
      </div>
      <div class="col-md-4 my-2">
        <div class="more-info-container">
          <div class="card">
            <div class="card-header">
              More info
            </div>
            <div class="card-body">
              <div v-if="metaInfo">
                <div class="accordion" id="accordionCESRMoreInfo">

                  <button class="btn btn-outline-success mb-3" style="width: 100%;" @click="copyToClipboard">
                    {{ cesrData!="" && copiedInClipboard ? "Copied To Clipboard!":"Copy To Clipboard" }}
                  </button>
                  
                  <Accordion v-if="metaInfo.code" title="Code" :value="metaInfo.code" id="cesr-collapse-1" parentID="accordionCESRMoreInfo" />

                  <Accordion v-if="metaInfo.counter_code" title="Base64 To Int" :value="metaInfo.counter_code +' > '+metaInfo.counter_code_int" id="cesr-collapse-2" parentID="accordionCESRMoreInfo" />

                  <Accordion v-if="metaInfo.name" title="Name" :value="metaInfo.name" id="cesr-collapse-3" parentID="accordionCESRMoreInfo" />

                  <Accordion v-if="metaInfo.code_len" title="Code Length" :value="metaInfo.code_len" id="cesr-collapse-4" parentID="accordionCESRMoreInfo" />

                  <Accordion v-if="metaInfo.total_len" title="Total Length" :value="metaInfo.total_len" id="cesr-collapse-5" parentID="accordionCESRMoreInfo" />

                  <Accordion v-if="metaInfo.description" title="Description" :value="metaInfo.description" id="cesr-collapse-6" parentID="accordionCESRMoreInfo" />

                </div>
              </div>
              <div v-else>
                Select a CESR data to get more information.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  props: ['outputData'],
  data(){
    return {
      metaInfo: null,
      cesrData: "",
      copiedInClipboard: false
    }
  },
  methods:{
    clickOnOutput(event){
      if(event.target.getAttribute('meta-cesr-code')) {
        this.cesrData = event.target.innerHTML;
        this.metaInfo = this.$getMetaInfoFromCESRCodetable(event.target.getAttribute('meta-cesr-code'));
        if(event.target.getAttribute('meta-cesr-count-code') && event.target.getAttribute('meta-cesr-count-code-int')) {
          this.metaInfo.counter_code = event.target.getAttribute('meta-cesr-count-code');
          this.metaInfo.counter_code_int = event.target.getAttribute('meta-cesr-count-code-int');
        }
        this.copiedInClipboard = false;
        // console.log(this.metaInfo);
      }
    },
    async copyToClipboard(){
      if(this.cesrData && navigator && navigator.clipboard) {
        await navigator.clipboard.writeText(this.cesrData);
        this.copiedInClipboard = true;
      } else {
        this.copiedInClipboard = false;
      }
    }
  }
}
</script>
<style>
.output-container {
  border: 1px solid rgba(0,0,0,.125);
  border-radius: 5px;
  padding: 20px;
  line-break: anywhere;
}
.more-info-container {
  position: sticky;
  top: 20px;
}

@media screen and (max-width: 768px) {
  .output-container {
    max-height: 400px;
    overflow: scroll;
  }
}
</style>