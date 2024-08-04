<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <header class="fixed top-0 left-0 right-0 bg-white shadow-md text-gray-800 py-4 px-6 flex justify-between items-center z-10 header-height">
      <button @click="gotoHomePage" class="home-button focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-full p-2 transition duration-300 ease-in-out transform hover:scale-110">
        <img src="@/assets/home.png" alt="Home" class="w-6 h-6 sm:w-8 sm:h-8"/>
      </button>

      <h1 v-if="!selectedBook" class="font-bold text-xl sm:text-3xl text-blue-600">AI-Assisted Reader</h1>
        <div class="flex items-center relative">
          <!-- <div v-if="selectedBook" class="relative">
            <button 
              @click="toggleDropdown"
              class="ai-tools-button focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-full p-2 transition duration-300 ease-in-out transform hover:scale-110"
            >
              <img src="@/assets/ai-tools.png" alt="AI Tools" class="w-6 h-6 sm:w-8 sm:h-8"/>
            </button>
            <div 
              v-if="showDropdown"
              class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20"
            >
              <a @click="chatWithBook" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Chat with Book</a>
              <a @click="explainPage" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Explain the page</a>
              <a @click="showBookSummaries" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Book Summaries</a>
            </div>
        </div> -->
              <!-- New buttons when a book is selected -->
        <div v-if="selectedBook" class="flex items-center space-x-4">
          <button @click="explainPage" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out">
            De-Jargonify
          </button>
          <button @click="chatWithBook" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out">
            Chat with Book
          </button>
        </div>
      </div>
    </header>

    <main class="container mx-auto px-4 pb-8 flex-grow pt-24 sm:pt-28 content-top-padding">

    <template v-if="!selectedBook">
        <div v-if="isBookLoading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white p-4 sm:p-8 rounded-lg shadow-xl text-center">
            <h3 class="text-lg sm:text-xl font-bold mb-4">Loading Book</h3>
            <div class="w-48 sm:w-64 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full bg-blue-500 transition-all duration-300 ease-out" :style="{ width: `${bookLoadingProgress}%` }"></div>
            </div>
            <p class="mt-2 text-sm sm:text-base">{{ bookLoadingProgress }}%</p>
          </div>
        </div>
        <h2 class="text-2xl sm:text-4xl font-bold mb-4 sm:mb-8 text-gray-800 text-center">Book Library</h2>

        <!-- Loading and error states (unchanged) -->
        <div v-if="!loading && !error" class="grid-container overflow-auto w-full max-w-7xl mx-auto">
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
            <div v-for="book in books" :key="book.name" 
                 class="book-thumbnail flex flex-col items-center justify-between h-full bg-white rounded-lg shadow-lg p-2 sm:p-4 transition duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl cursor-pointer"
                 @click="selectBook(book)">
              <img v-if="book.thumbnail" :src="`${API_ENDPOINT}${book.thumbnail}`" :alt="`Cover of ${book.name}`" class="w-full h-40 sm:h-64 object-cover rounded-lg mb-2 sm:mb-4" loading="lazy"/>
              <div v-else class="w-full h-40 sm:h-64 bg-gray-200 rounded-lg mb-2 sm:mb-4 flex items-center justify-center">
                <span class="text-gray-500 text-sm sm:text-base">No image</span>
              </div>            
              <h3 class="text-center text-gray-800 font-semibold text-xs sm:text-sm line-clamp-2">{{ book.name }}</h3>
            </div>
          </div>
        </div>
      </template>

      <ReadingAreaNew
      v-if="selectedBook"
      :book="selectedBook"
      :headerHeight="headerHeight"
      :contentHeight="contentHeight"
      ref="readingAreaRef"
      />

      <ChatWindow 
        v-if="showChat" 
        :isOpen="showChat" 
        :bookName="selectedBook ? selectedBook.name : ''"
        @close="handleCloseChat" 
      />
    </main>

    <footer v-if="!selectedBook" class="fixed bottom-0 left-0 right-0 bg-white shadow-md py-4 px-6 footer-height">
      <div class="container mx-auto flex justify-center">
        <input type="file" ref="fileInput" @change="onFileUpload" accept=".epub" class="hidden" :disabled="uploading" />
        <button @click="openFileSelector" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded cursor-pointer transition duration-300 ease-in-out transform hover:scale-105 text-sm sm:text-base" :class="{ 'opacity-50 cursor-not-allowed': uploading }">
          {{ uploading ? 'Uploading...' : 'Upload Book' }}
        </button>
      </div>
    </footer>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { API_ENDPOINT } from '@/config';
import ReadingAreaNew from './components/ReadingAreaNew.vue';
import ChatWindow from './components/ChatWindow.vue';



export default {
  name: 'App',
  components: {
    ReadingAreaNew,
    ChatWindow
  },
  setup() {
    const books = ref([]);
    const loading = ref(true);
    const uploading = ref(false);
    const error = ref(null);
    const selectedBook = ref(null);
    const showBookSummary = ref(false);
    const fileInput = ref(null);
    const isBookLoading = ref(false);
    const bookLoadingProgress = ref(0);
    const headerHeight = ref(64);
    const footerHeight = ref(56);
    const showChat = ref(false);
    const readingAreaRef = ref(null);
    const showDropdown = ref(false);

    const toggleDropdown = () => {
      showDropdown.value = !showDropdown.value;
    };

    const chatWithBook = () => {
      showDropdown.value = false;
      // Implement chat functionality
      toggleChat();
      // if (readingAreaRef.value) {
      //   readingAreaRef.value.toggleChat();
      // }
    };

    const explainPage = () => {
      showDropdown.value = false;
      console.log('going to try explain page');
      // Implement page explanation functionality
      if (readingAreaRef.value) {
        readingAreaRef.value.explainPage();
      }
    };

    const showBookSummaries = () => {
      showDropdown.value = false;
      // Implement book summaries functionality
      if (readingAreaRef.value) {
        readingAreaRef.value.toggleSummaryOverlay();
      }
    };


    const toggleChat = () => {
      showChat.value = !showChat.value;
    };

    const handleCloseChat = () => {
      showChat.value = false;
    };

    const toggleSummaryOverlay = () => {
      if (selectedBook.value && selectedBook.value.readingAreaRef) {
        selectedBook.value.readingAreaRef.toggleSummaryOverlay();
      }
    };

    const contentHeight = computed(() => {
      return `calc(100vh - ${headerHeight.value}px - ${footerHeight.value}px)`;
    });

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
      isBookLoading.value = true;
      bookLoadingProgress.value = 0;

      try {
        console.log("Starting to load...", book);
        const response = await axios.get(`${API_ENDPOINT}${book.epub}`, {
          responseType: 'arraybuffer',
          onDownloadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            bookLoadingProgress.value = percentCompleted;
          }
        });
        selectedBook.value = {
          ...book,
          epub: response.data,
          readingAreaRef: readingAreaRef
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
      handleResize,
      headerHeight,
      footerHeight,
      contentHeight,
      toggleSummaryOverlay,
      readingAreaRef,
      showDropdown,
      explainPage,
      showBookSummaries,
      toggleDropdown,
      chatWithBook
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


.header-height {
  height: 64px;
}

.footer-height {
  height: 56px;
}

.content-area {
  padding-top: 64px; /* Should match the header height */
  padding-bottom: 56px; /* Should match the footer height */
  height: v-bind(contentHeight);
  overflow-y: auto;
}


/* Mobile-specific styles */
/* @media (max-width: 640px) {
  .book-thumbnail {
    @apply touch-manipulation;
  }

  button, .home-button {
    @apply min-w-[44px] min-h-[44px];
  }
} */


@media (max-width: 640px) {
  .header-height {
    height: 56px; /* Smaller height for mobile if needed */
  }
  .content-top-padding {
    padding-top: 56px; /* Should match the mobile header height */
  }
}


.ai-tools-button {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  box-shadow: 0 2px 4px 0 rgba(0,0,0,0.1);
  z-index: 20;
}

.dropdown-item {
  display: block;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #4a5568;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background-color: #f7fafc;
}
</style>