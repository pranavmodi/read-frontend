<template>
  <div class="home-screen flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
    <h1 class="text-3xl font-bold mb-6 text-gray-800">Book Library</h1>
    <div v-if="loading" class="text-xl text-gray-600">Loading books...</div>
    <div v-else-if="error" class="text-xl text-red-500">{{ error }}</div>
    <div v-else class="grid-container overflow-auto w-full max-w-7xl">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 my-4">
        <div v-for="book in books" :key="book.name" class="book-thumbnail flex flex-col items-center h-full bg-white rounded-lg shadow-md p-4 transition duration-300 ease-in-out transform hover:scale-105">
          <img :src="book.thumbnail" :alt="`Cover of ${book.name}`" class="w-auto h-64 object-cover rounded-lg mb-2"/>
          <h3 class="text-center mt-2 text-gray-800 font-semibold">{{ book.name }}</h3>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';

export default {
  name: 'App',
  setup() {
    const books = ref([]);
    const loading = ref(true);
    const error = ref(null);

    const fetchBooks = async () => {
      try {
        const response = await axios.get('https://llmread-backend1-b3141e123407.herokuapp.com/get-books');
        books.value = response.data;
      } catch (err) {
        error.value = 'Failed to fetch books from the backend';
        console.error(err);
      } finally {
        loading.value = false;
      }
    };

    const selectBook = (book) => {
      console.log('Selected book:', book);
      // You can add more functionality here, like opening a modal or navigating to a detail page
    };

    onMounted(fetchBooks);

    return { books, loading, error, selectBook };
  }
}
</script>