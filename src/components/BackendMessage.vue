<template>
    <div class="mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 class="text-2xl font-bold mb-4 text-gray-800">Message from Backend</h2>
      <p v-if="loading" class="text-gray-600">Loading...</p>
      <p v-else-if="error" class="text-red-500">{{ error }}</p>
      <p v-else class="text-gray-700">{{ message }}</p>
    </div>
  </template>
  
  <script>
  import { ref, onMounted } from 'vue';
  import axios from 'axios';
  
  export default {
    name: 'BackendMessage',
    setup() {
      const message = ref('');
      const loading = ref(true);
      const error = ref(null);
  
      const fetchMessage = async () => {
        try {
          const response = await axios.get('https://llmread-backend1-b3141e123407.herokuapp.com/');
          message.value = response.data;
        } catch (err) {
          error.value = 'Failed to fetch message from backend';
        } finally {
          loading.value = false;
        }
      };
  
      onMounted(fetchMessage);
  
      return { message, loading, error };
    }
  };
  </script>