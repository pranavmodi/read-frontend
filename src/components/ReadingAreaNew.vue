<template>
  <div class="reading-area flex flex-col h-screen">
    <div v-if="loading" class="flex-grow flex items-center justify-center">
      <div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
    <div v-else-if="error" class="flex-grow flex items-center justify-center text-red-500">
      {{ error }}
    </div>
    <div v-else ref="epubViewerRef" id="epub-viewer" class="flex-grow"></div>
    
    <footer class="bg-gray-100 shadow-md">
      <div class="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
        <button @click="prevPage" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-full transition duration-300 ease-in-out transform hover:scale-105">
          &#8592; Previous
        </button>
        <button @click="nextPage" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-full transition duration-300 ease-in-out transform hover:scale-105">
          Next &#8594;
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
    const epubViewerRef = ref(null);

    const adjustViewerHeight = () => {
      if (epubViewerRef.value) {
        const viewportHeight = window.innerHeight;
        const footerHeight = 64; // Approximate height of the footer
        epubViewerRef.value.style.height = `${viewportHeight - footerHeight}px`;
      }
    };

    const loadBook = async () => {
      console.log('in loadbook');
      if (book.value) {
        book.value.destroy();
      }

      loading.value = true;
      error.value = null;

      try {
        book.value = new window.ePub(props.book.epub);
        adjustViewerHeight();
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
      window.addEventListener('resize', adjustViewerHeight);
    });

    onUnmounted(() => {
      if (book.value) {
        book.value.destroy();
      }
      document.removeEventListener('keyup', handleKeyPress);
      window.removeEventListener('resize', adjustViewerHeight);
    });

    watch(() => props.book, loadBook);

    return {
      prevPage,
      nextPage,
      loading,
      error,
      epubViewerRef
    };
  }
}
</script>

<style scoped>
.reading-area {
  height: 80vh;
  display: flex;
  flex-direction: column;
}

#epub-viewer {
  flex-grow: 1;
  overflow: hidden;
}

footer {
  flex-shrink: 0;
}
</style>