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
        <button @click="decreaseFontSize" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
          A-
        </button>
        <button @click="increaseFontSize" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
          A+
        </button>
        <button @click="nextPage" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-full transition duration-300 ease-in-out transform hover:scale-105">
          Next &#8594;
        </button>
        <button @click="toggleAdaptiveMode" :class="['bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded', {'opacity-50': !adaptiveModeEnabled}]">
          {{ adaptiveModeEnabled ? 'Adaptive: ON' : 'Adaptive: OFF' }}
        </button>
      </div>
    </footer>

  <div v-if="showSummaryOverlay" class="absolute inset-y-0 right-0 w-1/3 bg-white shadow-lg p-4 overflow-y-auto">
      <div class="flex justify-between mb-4">
        <div class="flex space-x-2">
          <button @click="switchSummaryTab('book')" :class="['px-3 py-1 rounded', summaryTab === 'book' ? 'bg-blue-500 text-white' : 'bg-gray-200']">
            Book Summary
          </button>
          <button @click="switchSummaryTab('chapter')" :class="['px-3 py-1 rounded', summaryTab === 'chapter' ? 'bg-blue-500 text-white' : 'bg-gray-200']">
            Chapter Summaries
          </button>
        </div>
        <button @click="toggleSummaryOverlay" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      <div v-if="summaryTab === 'book'">
        <h2 class="text-xl font-bold mb-2">Book Summary</h2>
        <p>{{ bookSummary }}</p>
      </div>
      <div v-else>
        <h2 class="text-xl font-bold mb-2">Chapter {{ currentChapter }} Summary</h2>
        <p>{{ chapterSummaries[currentChapter] }}</p>
      </div>
    </div>

    <!-- Toggle button for summary overlay -->
    <button @click="toggleSummaryOverlay" class="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
    </button>
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
    const fontSize = ref(16); // Default font size in pixels
    const showSummaryOverlay = ref(false);
    const summaryTab = ref('book'); // 'book' or 'chapter'
    const bookSummary = ref('');
    const chapterSummaries = ref({});
    const currentChapter = ref(1);
    const difficultyLevel = ref(5); // Scale of 1-10
    const adaptiveModeEnabled = ref(false);
 

    const toggleAdaptiveMode = () => {
      adaptiveModeEnabled.value = !adaptiveModeEnabled.value;
        if (adaptiveModeEnabled.value) {
          applyAdaptiveDifficulty();
        } else {
          resetTextDifficulty();
        }
    };

    const applyAdaptiveDifficulty = async () => {
      if (rendition.value && adaptiveModeEnabled.value) {
        const contents = await rendition.value.getContents();
        contents.forEach(content => {
          if (content.content) {
            const simplifiedText = simulateTextSimplification(content.content.innerHTML);
            content.content.innerHTML = simplifiedText;
          }
        });
      }
    };

    const simulateTextSimplification = (text) => {
      // This is a placeholder function. In a real implementation, you'd use an AI service to simplify the text.
      return text.replace(/\b\w{10,}\b/g, 'simplified_word');
    };

    const resetTextDifficulty = async () => {
          if (rendition.value) {
        const currentLocation = rendition.value.currentLocation();
        if (currentLocation) {
          const cfi = currentLocation.start.cfi;
          await rendition.value.display(cfi);
        } else {
          // If no current location, just redisplay from the beginning
          await rendition.value.display();
        }
      }
    };

    const toggleSummaryOverlay = async () => {
          adaptiveModeEnabled.value = !adaptiveModeEnabled.value;
          showSummaryOverlay.value = !showSummaryOverlay.value;
      if (adaptiveModeEnabled.value) {
        await applyAdaptiveDifficulty();
      } else {
        await resetTextDifficulty();
      }    
    };

    const switchSummaryTab = (tab) => {
      summaryTab.value = tab;
    };

    const getChapterSummary = async (chapterNumber) => {
      if (!chapterSummaries.value[chapterNumber]) {
        // Here you would call your AI service to generate the summary
        // For now, we'll use a placeholder
        chapterSummaries.value[chapterNumber] = `AI-generated summary for chapter ${chapterNumber}`;
      }
      return chapterSummaries.value[chapterNumber];
    };

    const getBookSummary = async () => {
      if (!bookSummary.value) {
        // Here you would call your AI service to generate the book summary
        // For now, we'll use a placeholder
        bookSummary.value = "AI-generated summary for the entire book";
      }
      return bookSummary.value;
    };

    const increaseFontSize = () => {
      fontSize.value = Math.min(fontSize.value + 2, 32);
      updateFontSize();
    };

    const decreaseFontSize = () => {
      fontSize.value = Math.max(fontSize.value - 2, 12);
      updateFontSize();
    };

    const updateFontSize = () => {
      if (rendition.value) {
        rendition.value.themes.fontSize(`${fontSize.value}px`);
      }
    };
    

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
        // adjustViewerHeight();
        rendition.value = book.value.renderTo('epub-viewer', {
          width: '100%',
          height: '100%',
          spread: 'always'
        });

        rendition.value.display();
        applyAdaptiveDifficulty();

        // await rendition.value.display();

        // Setup key listeners
        rendition.value.on('keyup', handleKeyPress);
        rendition.value.themes.fontSize(`${fontSize.value}px`);

        document.addEventListener('keyup', handleKeyPress);

        if (adaptiveModeEnabled.value) {
          await applyAdaptiveDifficulty();
        }

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
      epubViewerRef,
      fontSize,
      increaseFontSize,
      decreaseFontSize,
      difficultyLevel,
      showSummaryOverlay,
      summaryTab,
      bookSummary,
      chapterSummaries,
      currentChapter,
      adaptiveModeEnabled,
      toggleAdaptiveMode,
      toggleSummaryOverlay,
      switchSummaryTab,
      getChapterSummary,
      getBookSummary
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