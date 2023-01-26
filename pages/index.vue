<template>
  <div class="container mt-5">
    <div class="form-group">
      <label for="input-textarea">Enter your CESR data here...</label>
      <textarea class="form-control" v-model="inputData" id="input-textarea" rows="8"></textarea>
    </div>
    <div class="m-5 text-center">
      <button class="btn btn-success btn-lg" @click="processInput">Process</button>
    </div>
    <div>
      <PreviewField />
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      inputData: ""
    }
  },
  methods: {
    processInput() {
      console.log(this.inputData);
      if(this.inputData) {
        console.log("Parsing Started");
        this.$parseStream(this.inputData);
      }
        
    }
  }
}
</script>