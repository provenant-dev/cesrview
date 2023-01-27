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
        <div>
          <div class="card">
            <div class="card-header">
              More info
            </div>
            <div class="card-body">
              <div v-if="metaInfo">
                {{ metaInfo }}
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
      metaInfo: null
    }
  },
  methods:{
    clickOnOutput(event){
      if(event.target.getAttribute('meta-cesr-code')) {
        this.metaInfo = this.$getMetaInfoFromCESRCodetable(event.target.getAttribute('meta-cesr-code'));
        console.log(this.metaInfo);
      }
    }
  }
}
</script>
<style>
.output-container{
  border: 1px solid rgba(0,0,0,.125);
  border-radius: 5px;
  padding: 20px;
  line-break: anywhere;
}
</style>