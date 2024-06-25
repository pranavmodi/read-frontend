<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <header class="bg-white shadow-md text-gray-800 py-4 px-6 flex justify-between items-center">
      <button @click="gotoHomePage" class="home-button focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-full p-2 transition duration-300 ease-in-out transform hover:scale-110">
        <img src="@/assets/home.png" alt="Home" class="w-8 h-8"/>
      </button>
      <h1 class="font-bold text-3xl text-blue-600">Little AI-Assisted EPUB Reader</h1>
      <div class="w-8"></div> <!-- Placeholder for alignment -->
    </header>

    <main class="container mx-auto px-4 py-8 flex-grow">
      <h2 class="text-4xl font-bold mb-8 text-gray-800 text-center">Book Library</h2>
      <div v-if="loading" class="text-xl text-gray-600 text-center">
        <svg class="animate-spin h-8 w-8 mx-auto mb-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading books...
      </div>
      <div v-else-if="error" class="text-xl text-red-500 text-center bg-red-100 border border-red-400 rounded-lg p-4">
        {{ error }}
      </div>
      <div v-else class="grid-container overflow-auto w-full max-w-7xl mx-auto">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <div v-for="book in books" :key="book.name" 
               class="book-thumbnail flex flex-col items-center justify-between h-full bg-white rounded-lg shadow-lg p-4 transition duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl cursor-pointer"
               @click="selectBook(book)">
            <img :src="`${API_ENDPOINT}${book.thumbnail}`" :alt="`Cover of ${book.name}`" class="w-full h-64 object-cover rounded-lg mb-4"/>
            <h3 class="text-center text-gray-800 font-semibold text-sm line-clamp-2">{{ book.name }}</h3>
          </div>
        </div>
      </div>
    </main>

    <footer class="bg-white shadow-md py-4 px-6">
      <div class="container mx-auto flex justify-center">
        <label for="file-upload" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded cursor-pointer transition duration-300 ease-in-out transform hover:scale-105">
          Upload Book
        </label>
        <input id="file-upload" type="file" class="hidden" @change="onFileUpload" accept=".epub"/>
      </div>
    </footer>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { API_ENDPOINT } from '@/config'


export default {
  name: 'App',
  setup() {
    const books = ref([]);
    const loading = ref(true);
    const error = ref(null);

    const fetchBooks = async () => {
      try {
        const apiEndpoint = API_ENDPOINT;
        console.log('the endpoint is ', apiEndpoint);
        const response = await axios.get(`${apiEndpoint}/get-books`);
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

    const gotoHomePage = () => {
      location.reload();
    };

    const onFileUpload = (event) => {
      const file = event.target.files[0];
      if (file && file.name.endsWith('.epub')) {
        console.log('Uploading file:', file.name);
        // Add your file upload logic here
      } else {
        alert('Please select a valid EPUB file.');
      }
    };

    onMounted(fetchBooks);

    return { books, loading, error, selectBook, gotoHomePage, onFileUpload, API_ENDPOINT };
  }
}
</script>

<style>
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

/* Additional custom styles if needed */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>