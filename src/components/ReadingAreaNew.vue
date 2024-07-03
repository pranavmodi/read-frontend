<template>
  <div class="reading-area flex flex-col h-screen relative">
    <!-- Original book view -->
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

    <!-- Summary overlay -->
    <div v-if="showSummaryOverlay" class="absolute inset-0 bg-white z-10 flex flex-col">
      <div v-if="isProcessing" class="flex-grow flex flex-col items-center justify-center">
        <div class="w-64 bg-gray-200 rounded-full h-6 dark:bg-gray-700 mb-4">
          <div class="bg-blue-600 h-6 rounded-full" :style="{ width: `${progress}%` }"></div>
        </div>
        <p>Processing: {{ progress }}%</p>
      </div>
      <div v-else class="flex-grow overflow-y-auto p-4">
        <div class="mb-4">
          <select v-model="summaryType" class="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
            <option value="book">Entire Book Summary</option>
            <option value="chapters">Chapter Summaries</option>
          </select>
        </div>
        <h2 class="text-2xl font-bold mb-4">{{ summaryType === 'book' ? 'Book Summary' : 'Chapter Summaries' }}</h2>
        <div v-if="summaryType === 'book'">
          <p>{{ bookSummary }}</p>
        </div>
        <div v-else>
          <div v-for="(chapter, index) in chapterSummaries" :key="index" class="mb-4">
            <h3 class="text-xl font-semibold">{{ chapter.title }}</h3>
            <p>{{ chapter.content }}</p>
          </div>
        </div>
      </div>
      <footer class="bg-gray-100 shadow-md">
        <div class="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <button @click="toggleSummaryOverlay" :disabled="isProcessing" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50">
            Close Summary
          </button>
        </div>
      </footer>
    </div>

    <!-- Toggle button for summary overlay -->
    <button @click="toggleSummaryOverlay" class="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
    </button>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { API_ENDPOINT } from '@/config';
import io from 'socket.io-client';


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
    const summarizedContent = ref([]);
    const currentSummaryPage = ref(0);
    const currentSummaryContent = ref('');
    const isProcessing = ref(false);
    const progress = ref(0);
    const socket = ref(null);
    const summaryType = ref('book');
    const currentChapterURI = ref('');
    const bookTitle = ref(props.book.name || 'Unknown Book');
    const db_bookTitle = ref(null);

    const connectSocket = () => {
      socket.value = io(API_ENDPOINT);
      
      socket.value.on('connect', () => {
        console.log('Socket connected');
        console.log('the book title', bookTitle.value)
      });
      
      socket.value.on('progress_update', (data) => {
        progress.value = data.progress;
      });

      socket.value.on('processing_complete', (data) => {
        console.log('Processing complete event received:', data);
        if (data.book_title === bookTitle.value) {
          console.log('Processing complete for current book');
          isProcessing.value = false;
          getBookSummary();
          getChapterSummaries();
        }
      });

      socket.value.on('disconnect', () => {
        console.log('Socket disconnected');
      });
    };

    const disconnectSocket = () => {
      console.log("in disconnect now");
      if (socket.value) {
        socket.value.disconnect();
      }
    };


    const processEpub = async () => {
      try {
        isProcessing.value = true;
        progress.value = 0;
        
        const response = await fetch(`${API_ENDPOINT}/process-epub`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: props.book.filename,
            name: props.book.name
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to process ePub');
        }
        
        // The socket will handle progress updates and trigger getBookSummary and getChapterSummaries when done
      } catch (error) {
        console.error('Error processing ePub:', error);
        isProcessing.value = false;
      }
    };

    const generatePlaceholderSummaries = () => {
      bookSummary.value = "This is a placeholder for the entire book summary. It provides an overview of the main themes, characters, and plot points discussed throughout the book.";
      
      chapterSummaries.value = Array(10).fill().map((_, index) => 
        `This is a placeholder summary for Chapter ${index + 1}. It briefly describes the key events, character developments, and important points covered in this chapter.`
      );
    };
 

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

    const generateChapterIdentifier = (chapterName) => {
      if (!chapterName) {
        return `${bookTitle.value}_Chapter_${currentChapterURI.value}`;
      } else {
        return `${bookTitle.value}_Chapter_${chapterName}`;
      }
    };


    const getChapterSummaries = async () => {
      if (!book.value) {
        console.error("Book not loaded");
        return;
      }
      // console.log("the props.book ", props.book);
      const chapters = book.value.spine.spineItems;
      const summaryPromises = chapters.map(async chapter => {
      const chapterId = generateChapterIdentifier(chapter.href);
        
        try {
          const response = await fetch(`${API_ENDPOINT}/chapter-summary/${encodeURIComponent(chapterId)}`);
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          const data = await response.json();
          
          if (data.status === 'success') {
            return {
              title: data.chapter_summary.title,
              content: data.chapter_summary.summary
            };
          } else {
            return {
              title: "Chapter Summary for " + chapter.href,
              content: "Summary is pending for this chapter."
            };
          }
        } catch (error) {
          console.error("Error fetching summary for chapter:", chapter.href, error);
          return {
            title: "Chapter Summary for " + chapter.href,
            content: "An error occurred while fetching the chapter summary."
          };
        }
      });

      try {
        const summaries = await Promise.all(summaryPromises);
        chapterSummaries.value = summaries;
      } catch (error) {
        console.error("Error fetching chapter summaries:", error);
      }
    };

    const simulateTextSimplification = (text) => {
      // This is a placeholder function. In a real implementation, you'd use an AI service to simplify the text.
      // return text.replace(/\b\w{10,}\b/g, 'simplified_word');
      const t = text[0];
      return t;
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

    // const toggleSummaryOverlay = async () => {
    //   adaptiveModeEnabled.value = !adaptiveModeEnabled.value;
    //   showSummaryOverlay.value = !showSummaryOverlay.value;
    //   if (showSummaryOverlay.value) {
    //     await processEpub();
    //   }
    //   if (adaptiveModeEnabled.value) {
    //     await applyAdaptiveDifficulty();
    //   } else {
    //     await resetTextDifficulty();
    //   }    
    // };

    const toggleSummaryOverlay = async () => {
      if (!showSummaryOverlay.value) {
        showSummaryOverlay.value = true;
        connectSocket();
        await processEpub();
      } else {
        disconnectSocket();
        showSummaryOverlay.value = false;
      }
    };



    const getChapterSummary = async (chapterNumber) => {
      if (!chapterSummaries.value[chapterNumber]) {
        // Here you would call your AI service to generate the summary
        // For now, we'll use a placeholder
        chapterSummaries.value[chapterNumber] = `AI-generated summary for chapter ${chapterNumber}`;
      }
      return chapterSummaries.value[chapterNumber];
    };


    // const fetchSummary = async () => {
    //   try {
    //     const response = await fetch(`${API_ENDPOINT}/get-summary/${props.book.title}`);
    //     if (!response.ok) {
    //       throw new Error('Failed to fetch summary');
    //     }
    //     const result = await response.json();
    //     summarizedContent.value = result.summary;
    //     currentSummaryContent.value = summarizedContent.value[0] || '';
    //   } catch (error) {
    //     console.error('Error fetching summary:', error);
    //   }
    // };

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
      console.log('in loadbook', props.book.name);
      if (book.value) {
        book.value.destroy();
      }

      loading.value = true;
      error.value = null;

      try {
        book.value = new window.ePub(props.book.epub);
        book.value.loaded.metadata.then(metadata => {
        // Get the book title
        db_bookTitle.value = metadata.title;
        console.log('db Book Title:', db_bookTitle);
      }).catch(error => {
        console.error('Error loading EPUB:', error);
      });
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

    const getBookSummary = async () => {
      // const encodedBookTitle = encodeURIComponent(bookTitle.value);
      const encodedBookTitle = encodeURIComponent(db_bookTitle.value);

      try {
        const response = await fetch(`${API_ENDPOINT}/book-summary/${encodedBookTitle}`);
        
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        bookSummary.value = data.book_summary;
      } catch (error) {
        console.error("Error fetching book summary:", error);
        bookSummary.value = "Failed to load book summary.";
      }
    };


    const nextSummaryPage = () => {
      if (currentSummaryPage.value < summarizedContent.value.length - 1) {
        currentSummaryPage.value++;
        currentSummaryContent.value = summarizedContent.value[currentSummaryPage.value];
      }
    };

    const prevSummaryPage = () => {
      if (currentSummaryPage.value > 0) {
        currentSummaryPage.value--;
        currentSummaryContent.value = summarizedContent.value[currentSummaryPage.value];
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
      disconnectSocket();
    });

    watch(() => props.book, loadBook);

        // Watch for changes in the current chapter
    watch(() => props.book.currentChapter, (newChapter) => {
      if (newChapter) {
        currentChapterURI.value = newChapter.href;
      }
    });

    watch(isProcessing, (newValue) => {
      if (!newValue) {
        // Processing is complete, update the UI
        getBookSummary();
        getChapterSummaries();
      }
    });

    watch(() => props.book.title, (newTitle) => {
      if (newTitle) {
        bookTitle.value = newTitle;
      }
    });

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
      getChapterSummary,
      getBookSummary,
      processEpub,
      nextSummaryPage,
      prevSummaryPage,
      currentSummaryContent,
      isProcessing,
      progress,
      summaryType,
      generatePlaceholderSummaries
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