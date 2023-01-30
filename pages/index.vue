<template>
  <div class="container mt-5">
    <div class="form-group">
      <label for="input-textarea">Enter your CESR data here...</label>
      <textarea class="form-control" v-model="inputData" id="input-textarea" rows="8" placeholder="CESR data..."></textarea>
    </div>
    <div class="m-5 text-center">
      <button class="btn btn-success btn-lg" @click="processInput">Process</button>
    </div>
    <div>
      <PreviewField :outputData="outputData" />
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      inputData: "",
      outputData: ""
    }
  },
  methods: {
    processInput() {
      if(this.inputData) {
        console.log("Parsing Started");
        let sanitizedData = this.sanitizeInput(this.inputData);
        let temp = this.$parseStream(sanitizedData);
        this.outputData =  this.$generateCESRHtml(temp);
        // console.log(this.outputData);
      }
    },
    sanitizeInput(string) {
      const map = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
      };
      const reg = /[&<>]/ig;
      return string.replace(reg, (match)=>(map[match]));
    }
  }
}
</script>