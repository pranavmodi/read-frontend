<template>
    <div class="reading-area flex flex-col h-full">
      <div v-if="loading" class="flex-grow flex items-center justify-center">
        Loading...
      </div>
      <div v-else-if="error" class="flex-grow flex items-center justify-center text-red-500">
        {{ error }}
      </div>
      <div v-else id="epub-viewer" class="flex-grow"></div>
      
      <footer class="bg-gray-100 p-4">
        <div class="flex justify-between max-w-3xl mx-auto">
          <button @click="prevPage" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            Previous
          </button>
          <button @click="nextPage" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            Next
          </button>
        </div>
      </footer>
    </div>
  </template>
  
  <script>
  import { ref, onMounted, onUnmounted, watch } from 'vue';
  
  export default {
    name: 'ReadingAreaNew',
    props: {
      book: {
        type: Object,
        required: true
      }
    },
    setup(props) {
      const book = ref(null);
      const rendition = ref(null);
      const loading = ref(true);
      const error = ref(null);
  
      const loadBook = async () => {
        if (book.value) {
          book.value.destroy();
        }
  
        loading.value = true;
        error.value = null;
  
        try {
          // Use the global ePub object
          book.value = new window.ePub(props.book.epub);
          rendition.value = book.value.renderTo('epub-viewer', {
            width: '100%',
            height: '100%',
            spread: 'always'
          });
  
          rendition.value.display();
  
          // Setup key listeners
          rendition.value.on('keyup', handleKeyPress);
          document.addEventListener('keyup', handleKeyPress);
  
          loading.value = false;
        } catch (err) {
          console.error('Error loading book:', err);
          error.value = 'Failed to load the book. Please try again.';
          loading.value = false;
        }
      };
  
      const prevPage = () => {
        if (rendition.value) {
          rendition.value.prev();
        }
      };
  
      const nextPage = () => {
        if (rendition.value) {
          rendition.value.next();
        }
      };
  
      const handleKeyPress = (event) => {
        switch(event.key) {
          case 'ArrowLeft':
            prevPage();
            break;
          case 'ArrowRight':
            nextPage();
            break;
        }
      };
  
      onMounted(() => {
        loadBook();
      });
  
      onUnmounted(() => {
        if (book.value) {
          book.value.destroy();
        }
        document.removeEventListener('keyup', handleKeyPress);
      });
  
      watch(() => props.book, loadBook);
  
      return {
        prevPage,
        nextPage,
        loading,
        error
      };
    }
  }
  </script>
  
  <style scoped>
  .reading-area {
    height: calc(100vh - 4rem); /* Adjust this value based on your header/footer height */
    display: flex;
    flex-direction: column;
  }
  
  #epub-viewer {
    flex-grow: 1;
    overflow: auto;
  }
  
  footer {
    flex-shrink: 0;
  }
  </style>