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
      <template v-if="!selectedBook">
        <div v-if="isBookLoading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white p-8 rounded-lg shadow-xl text-center">
            <h3 class="text-xl font-bold mb-4">Loading Book</h3>
            <div class="w-64 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full bg-blue-500 transition-all duration-300 ease-out" :style="{ width: `${bookLoadingProgress}%` }"></div>
            </div>
            <p class="mt-2">{{ bookLoadingProgress }}%</p>
          </div>
        </div>
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
              <img v-if="book.thumbnail" :src="`${API_ENDPOINT}${book.thumbnail}`" :alt="`Cover of ${book.name}`" class="w-full h-64 object-cover rounded-lg mb-4"/>
              <div v-else class="w-full h-64 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                <span class="text-gray-500">No image available</span>
              </div>            
              <h3 class="text-center text-gray-800 font-semibold text-sm line-clamp-2">{{ book.name }}</h3>
            </div>
          </div>
        </div>
      </template>

      <ReadingAreaNew
        v-if="selectedBook"
        :book="selectedBook"
      />

    </main>

    <footer class="bg-white shadow-md py-4 px-6">
      <div class="container mx-auto flex justify-center">
        <template v-if="!selectedBook">

          <input type="file" ref="fileInput" @change="onFileUpload" accept=".epub" class="hidden" :disabled="uploading" />
          <button @click="openFileSelector" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded cursor-pointer transition duration-300 ease-in-out transform hover:scale-105" :class="{ 'opacity-50 cursor-not-allowed': uploading }">
            {{ uploading ? 'Uploading...' : 'Upload Book' }}
          </button>
        </template>
      </div>
    </footer>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { API_ENDPOINT } from '@/config';
// import ReadingArea from './components/ReadingArea.vue';
import ReadingAreaNew from './components/ReadingAreaNew.vue';

export default {
  name: 'App',
  components: {
    ReadingAreaNew
  },
  setup() {
    const books = ref([]);
    const loading = ref(true);
    const uploading = ref(false);
    const error = ref(null);
    const selectedBook = ref(null);
    const showBookSummary = ref(false);
    const showChat = ref(false);
    const fileInput = ref(null);
    const isBookLoading = ref(false);
    const bookLoadingProgress = ref(0);

    const fetchBooks = async () => {
      try {
        console.log('the endpoint is ', API_ENDPOINT);
        const response = await axios.get(`${API_ENDPOINT}/get-books`);
        books.value = response.data;
      } catch (err) {
        error.value = 'Failed to fetch books from the backend';
        console.error(err);
      } finally {
        loading.value = false;
      }
    };

    const selectBook = async (book) => {
      console.log('Selected book:', book);
      isBookLoading.value = true;
      bookLoadingProgress.value = 0;

      try {
        console.log("Starting to load...");
        const response = await axios.get(`${API_ENDPOINT}${book.epub}`, {
          responseType: 'arraybuffer',
          onDownloadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            bookLoadingProgress.value = percentCompleted;
          }
        });
        selectedBook.value = {
          ...book,
          epub: response.data
        };
        console.log("Finished loading");
      } catch (error) {
        console.error('Error loading EPUB:', error);
      } finally {
        isBookLoading.value = false;
      }
    };

    const gotoHomePage = () => {
      selectedBook.value = null;
      showBookSummary.value = false;
      showChat.value = false;
    };


    const openFileSelector = () => {
      console.log("bhosdi wale")
      if (fileInput.value) {
        fileInput.value.click();
      }
    };

    const onFileUpload = async (event) => {
      const file = event.target.files[0];
      if (file && file.name.endsWith('.epub')) {
        console.log('Uploading file:', file.name);
        
        const formData = new FormData();
        formData.append('file', file);

        try {
          uploading.value = true;
          const response = await axios.post(`${API_ENDPOINT}/upload-epub`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          console.log('Upload response:', response.data);
          alert('File uploaded successfully!');
          // Refresh the book list after successful upload
          await fetchBooks();
        } catch (error) {
          console.error('Error uploading file:', error);
          alert('Error uploading file. Please try again.');
        } finally {
          uploading.value = false;
        }
      } else {
        alert('Please select a valid EPUB file.');
      }
    };

    const toggleBookSummary = () => {
      showBookSummary.value = !showBookSummary.value;
    };

    const toggleChat = () => {
      showChat.value = !showChat.value;
    };

    const handleCloseChat = () => {
      showChat.value = false;
    };

    const handleCloseSummary = () => {
      showBookSummary.value = false;
    };

    const handleResize = () => {
      // Implement resize logic if needed
    };

    onMounted(fetchBooks);

    return { 
      books, 
      loading, 
      uploading,
      error, 
      selectedBook, 
      isBookLoading,
      bookLoadingProgress,
      showBookSummary,
      showChat,
      API_ENDPOINT,
      selectBook, 
      gotoHomePage, 
      fileInput,
      openFileSelector,
      onFileUpload,
      toggleBookSummary,
      toggleChat,
      handleCloseChat,
      handleCloseSummary,
      handleResize
    };
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