<template>
  <div class="reading-area flex flex-col h-screen relative" :style="{ paddingTop: `${headerHeight}px` }">
    <!-- Original book view -->
    <div v-if="loading" class="flex-grow flex items-center justify-center">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
    <div v-else-if="error" class="flex-grow flex items-center justify-center text-red-500 px-4 text-center text-sm">
      {{ error }}
    </div>
    <div ref="epubViewerRef" id="epub-viewer" class="flex-grow"></div>
    
    <footer class="bg-gray-100 shadow-md">
      <div class="max-w-4xl mx-auto px-2 py-1 flex justify-between items-center">
        <button @click="prevPage" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded-full text-xs transition duration-300 ease-in-out transform hover:scale-105">
          &#8592;
        </button>
        <div class="flex space-x-1">
          <button @click="decreaseFontSize" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded text-xs">
            A-
          </button>
          <button @click="increaseFontSize" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded text-xs">
            A+
          </button>
        </div>
        <button @click="nextPage" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded-full text-xs transition duration-300 ease-in-out transform hover:scale-105">
          &#8594;
        </button>
      </div>
    </footer>

    <!-- Summary Overlay -->
    <div v-if="showSummaryOverlay" class="absolute inset-0 bg-white z-10 flex flex-col overflow-hidden">
      <div v-if="isProcessing" class="flex-grow flex flex-col items-center justify-center p-4">
        <div class="w-64 bg-gray-200 rounded-full h-6 dark:bg-gray-700 mb-4">
          <div class="bg-blue-600 h-6 rounded-full" :style="{ width: `${progress}%` }"></div>
        </div>
        <p class="text-sm sm:text-base">Processing: {{ progress }}%</p>
      </div>
      <div v-else class="flex-grow overflow-y-auto p-4">
        <!-- Segmented Control -->
        <div class="mb-4 sm:mb-6 flex justify-center">
          <div class="inline-flex rounded-md shadow-sm" role="group">
            <button 
              @click="summaryType = 'book'" 
              :class="[
                'px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border transition-colors duration-200',
                summaryType === 'book' 
                  ? 'bg-blue-500 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              ]"
            >
              Book Summary
            </button>
            <button 
              @click="summaryType = 'chapters'" 
              :class="[
                'px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border transition-colors duration-200',
                summaryType === 'chapters' 
                  ? 'bg-blue-500 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              ]"
            >
              Chapters
            </button>
          </div>
        </div>

        <!-- Content -->
        <h2 class="text-xl sm:text-2xl font-bold mb-4 text-center">
          {{ summaryType === 'book' ? 'Book Summary' : 'Chapter Summaries' }}
        </h2>
        <div v-if="summaryType === 'book'" class="text-sm sm:text-base">
          <p>{{ bookSummary }}</p>
        </div>
        <div v-else>
          <div v-for="(chapter, index) in chapterSummaries" :key="index" class="mb-4">
            <h3 class="text-lg sm:text-xl font-semibold">{{ chapter.title }}</h3>
            <p class="text-sm sm:text-base">{{ chapter.content }}</p>
          </div>
        </div>
      </div>
      <footer class="bg-gray-100 shadow-md">
        <div class="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <button @click="toggleSummaryOverlay" :disabled="isProcessing" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-sm sm:text-base disabled:opacity-50 transition-colors duration-200">
            Close Summary
          </button>
        </div>
      </footer>
    </div>

    <!-- Toggle button for summary overlay -->
    <button @click="toggleSummaryOverlay" class="fixed bottom-10 right-2 bg-blue-500 text-white p-1 rounded-full shadow-lg z-20">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
    </button>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { API_ENDPOINT } from '@/config';
import io from 'socket.io-client';


export default {
  name: 'ReadingAreaNew',
  props: {
    book: {
      type: Object,
      required: true
    },
    headerHeight: {
      type: Number,
      required: true
    },
    contentHeight: {
      type: String,
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
    const touchStartX = ref(0);
    const touchEndX = ref(0);
    const touchStartTime = ref(0);
    // const db_bookTitle = ref(null);


    const epubViewerHeight = computed(() => props.contentHeight);


    // const epubViewerHeight = computed(() => {
    //   return `calc(100vh - ${props.headerHeight}px - 50px)`; // 50px for footer, adjust if needed
    // });

    const mobileEpubViewerHeight = computed(() => {
      return `calc(100vh - ${props.headerHeight}px - 90px)`; // 90px for mobile footer, adjust if needed
    });

    const handleTouchStart = (event) => {
      try {
        touchStartX.value = event.changedTouches[0].clientX;
        touchStartTime.value = Date.now();
      } catch (error) {
        console.error('Error in handleTouchStart:', error);
      }
    };

    const handleTouchEnd = (event) => {
      try {
        touchEndX.value = event.changedTouches[0].clientX;
        handleTapOrSwipe();
      } catch (error) {
        console.error('Error in handleTouchEnd:', error);
      }
    };

    const resetTouchValues = () => {
      touchStartX.value = 0;
      touchEndX.value = 0;
      touchStartTime.value = 0;
    };


    const handleTapOrSwipe = () => {
      const tapThreshold = 10; // maximum distance moved to be considered a tap
      const swipeThreshold = 50; // minimum distance moved to be considered a swipe
      const timeThreshold = 300; // maximum time in ms for a swipe

      const touchDistance = Math.abs(touchEndX.value - touchStartX.value);
      const touchTime = Date.now() - touchStartTime.value;

      if (touchDistance < tapThreshold && touchTime < timeThreshold) {
        handleTap(touchEndX.value);
      } else if (touchDistance > swipeThreshold && touchTime < timeThreshold) {
        handleSwipe();
      }

      resetTouchValues();
    };

    
    const handleSwipe = () => {
      const swipeDistance = touchEndX.value - touchStartX.value;
      
      if (swipeDistance > 0) {
        prevPage();
      } else if (swipeDistance < 0) {
        nextPage();
      }
    };

    const handleTap = (x) => {
      const viewerElement = document.getElementById('epub-viewer');
      if (!viewerElement) return;

      const viewerWidth = viewerElement.offsetWidth;
      const tapPosition = x - viewerElement.getBoundingClientRect().left;

      viewerElement.classList.add('tapped');
      setTimeout(() => viewerElement.classList.remove('tapped'), 200);

      if (tapPosition < viewerWidth / 2) {
        prevPage();
      } else {
        nextPage();
      }
    };

    const setupSocketListeners = () => {
      if (!socket.value) return;

      socket.value.on('connect', () => {
        console.log('Socket connected');
      });

      socket.value.on('progress_update', (data) => {
        progress.value = data.progress;
      });

      socket.value.on('processing_complete', (data) => {
        console.log('Processing complete event received:', data);
        console.log('the props book name', props.book.name);
        if (data.book_name === props.book.name) {
          console.log('Processing complete for current book');
          isProcessing.value = false;
          getBookSummary();
          getAllSummaries();
        }
      });

      socket.value.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      socket.value.on('connect_error', (error) => {
        console.error('Connection Error:', error);
      });
    };


    const connectSocket = () => {
      if (socket.value && socket.value.connected) {
        console.log('Socket already connected');
        return;
      }

      socket.value = io(API_ENDPOINT, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      setupSocketListeners();
    };
    // const connectSocket = () => {
    //   socket.value = io(API_ENDPOINT, {
    //     transports: ['websocket', 'polling'], // Try both WebSocket and long-polling
    //     reconnection: true,
    //     reconnectionAttempts: Infinity,
    //     reconnectionDelay: 1000,
    //     reconnectionDelayMax: 5000,
    //     timeout: 20000,
    //     forceNew: true
    //   });
      
    //   socket.value.on('connect', () => {
    //     console.log('Socket connected');
    //     console.log('the book title', bookTitle.value)
    //   });
      
    //   socket.value.on('progress_update', (data) => {
    //     progress.value = data.progress;
    //   });

    //   socket.value.on('processing_complete', (data) => {
    //     console.log('Processing complete event received:', data);
    //     if (data.book_name === props.book.name) {
    //       console.log('Processing complete for current book');
    //       isProcessing.value = false;
    //       getBookSummary();
    //       getChapterSummaries();
    //     }
    //   });

    //   socket.value.on('disconnect', (reason) => {
    //     console.log('Socket disconnected', reason);
    //   });
    // };

    // socket.value.on('connect_error', (error) => {
    //   console.log('Connection Error:', error);
    // });

    // socket.value.on('disconnect', (reason) => {
    //   console.log('Disconnected:', reason);
    //   if (reason === 'io server disconnect') {
    //     // the disconnection was initiated by the server, you need to reconnect manually
    //     socket.value.connect();
    //   }
    //   // else the socket will automatically try to reconnect
    // });

    // socket.value.on('reconnect_attempt', (attemptNumber) => {
    //   console.log('Attempting reconnection:', attemptNumber);
    // });

    // socket.value.on('reconnect_error', (error) => {
    //   console.error('Reconnection error:', error);
    // });

    // socket.value.on('reconnect_failed', () => {
    //   console.error('Failed to reconnect');
    // });

    const disconnectSocket = () => {
      if (socket.value) {
        socket.value.disconnect();
        socket.value = null;
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

    // const generateChapterIdentifier = (chapterHref) => {
    //   try {
    //     const bookName = props.book.name || 'UnknownBook';
    //     // const chapterUri = chapterHref.split('/').pop(); // Get the filename from the href
    //     const chapterIdentifier = `${bookName}_Chapter_${chapterHref}`;
        
    //     // Encode the entire chapter identifier
    //     // console.log(' Chapter Identifier:', chapterIdentifier);
    //     const encodedChapterIdentifier = encodeURIComponent(chapterIdentifier);
    //     return encodedChapterIdentifier;
    //   } catch (error) {
    //     console.error('Error generating chapter identifier:', error);
    //     return '';
    //   }
    // };

    const generateChapterIdentifier = (chapterHref) => {
      try {
        const bookName = props.book.name || 'UnknownBook';
        // const chapterUri = chapterHref.split('/').pop(); // Get the filename from the href
        const chapterIdentifier = `${bookName}_Chapter_${chapterHref}`;
        
        // Encode the entire chapter identifier
        // console.log(' Chapter Identifier:', chapterIdentifier);
        // const encodedChapterIdentifier = encodeURIComponent(chapterIdentifier);
        return chapterIdentifier;
      } catch (error) {
        console.error('Error generating chapter identifier:', error);
        return '';
      }
    };

    const getAllSummaries = async () => {
      if (!book.value) {
        console.error("Book not loaded");
        return;
      }
      console.log('in all summaries')
      const chapters = book.value.spine.spineItems;
      const chapterIds = chapters.map(chapter => generateChapterIdentifier(chapter.href));
      const bookName = props.book.name || "Unknown Book";

      try {
        const response = await fetch(`${API_ENDPOINT}/all-summaries`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookName: bookName,
            chapterIds: chapterIds
          })
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();

        if (data.status === 'success') {
          chapterSummaries.value = chapters.map((chapter, index) => {
            const chapterId = generateChapterIdentifier(chapter.href);
            const summaryData = data.summaries[chapterId];
            
            let content;
            if (summaryData && summaryData.status === 'success') {
              if (summaryData.chapter_summary.is_main_content) {
                content = summaryData.chapter_summary.summary;
              } else {
                content = "This is not relevant information";
              }
            } else {
              content = "Summary is pending for this chapter.";
            }

            return {
              title: `Chapter ${index + 1}`,
              content: content
            };
          });
        } else {
          throw new Error('Failed to fetch summaries');
        }
      } catch (error) {
        console.error("Error fetching chapter summaries:", error);
        chapterSummaries.value = chapters.map((_, index) => ({
          title: `Chapter ${index + 1}`,
          content: "An error occurred while fetching the chapter summary."
        }));
      }
    };

    // const getChapterSummaries = async () => {
    //   if (!book.value) {
    //     console.error("Book not loaded");
    //     return;
    //   }

    //   const chapters = book.value.spine.spineItems;
    //   const summaryPromises = chapters.map(async (chapter, index) => {
    //   const chapterId = generateChapterIdentifier(chapter.href);

    //   try {
    //     const response = await fetch(`${API_ENDPOINT}/chapter-summary/${chapterId}`);
    //     if (!response.ok) {
    //       throw new Error('Network response was not ok');
    //     }
    //     const data = await response.json();
        
    //     if (data.status === 'success') {
    //       return {
    //         title: `Chapter ${index + 1}`,
    //         content: data.chapter_summary.summary
    //       };
    //     } else {
    //       return {
    //         title: `Chapter ${index + 1}`,
    //         content: "Summary is pending for this chapter."
    //       };
    //     }
    //   } catch (error) {
    //     console.error("Error fetching summary for chapter:", chapter.href, error);
    //     return {
    //       title: `Chapter ${index + 1}`,
    //       content: "An error occurred while fetching the chapter summary."
    //     };
    //   }
    // });
// 
  //   try {
  //     const summaries = await Promise.all(summaryPromises);
  //     chapterSummaries.value = summaries;
  //   } catch (error) {
  //     console.error("Error fetching chapter summaries:", error);
  //   }
  // };

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

        await rendition.value.display();

        rendition.value.on('touchstart', handleTouchStart);
        rendition.value.on('touchend', handleTouchEnd);
        // rendition.value.on('touchmove', (e) => {
        //   console.log('Touch move event', e);
        // });

        rendition.value.on('keyup', handleKeyPress);
        rendition.value.themes.fontSize(`${fontSize.value}px`);

        document.addEventListener('keyup', handleKeyPress);

        if (adaptiveModeEnabled.value) {
          await applyAdaptiveDifficulty();
        }

        loading.value = false;
        console.log('Book loaded successfully');
        return true;

        } catch (err) {
        console.error('Error loading book:', err);
        error.value = 'Failed to load the book. Please try again.';
        loading.value = false;
        }
    };

    const initializeEpubViewer = async () => {
      const success = await loadBook();
      if (success) {
        console.log('Before addTouchListeners:', checkEpubViewer());
        addTouchListeners();
      }
    };

    const checkEpubViewer = () => {
      const epubViewerElement = document.getElementById('epub-viewer');
      console.log('Checking epub viewer:', epubViewerElement ? 'Found' : 'Not found');
      return epubViewerElement;
    };

    const prevPage = () => {
      if (rendition.value) {
        const viewer = document.getElementById('epub-viewer');
        viewer.style.opacity = '0.5';
        rendition.value.prev();
        setTimeout(() => {
          viewer.style.opacity = '1';
        }, 300);
      }
    };

    const nextPage = () => {
      if (rendition.value) {
        const viewer = document.getElementById('epub-viewer');
        viewer.style.opacity = '0.5';
        rendition.value.next();
        setTimeout(() => {
          viewer.style.opacity = '1';
        }, 300);
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
      if (!book.value) {
        console.error("Book not loaded");
        return;
      }

      try {
        // Wait for the metadata to load
        // const metadata = await book.value.loaded.metadata;
        const encodedBookTitle = encodeURIComponent(props.book.name);

        // Fetch the book summary
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

    // const addTouchListeners = () => {
    //   const epubViewerElement = document.getElementById('epub-viewer');
    //   if (epubViewerElement) {
    //     console.log('Adding touch event listeners');
    //     epubViewerElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    //     epubViewerElement.addEventListener('touchend', handleTouchEnd, { passive: true });
        
    //     // Add logging to check if events are firing
    //     epubViewerElement.addEventListener('touchmove', (e) => {
    //       console.log('Touch move event', e);
    //     }, { passive: true });
    //   } else {
    //     console.error('epub-viewer element not found');
    //   }
    // };

    const addTouchListeners = () => {
      console.log('Adding touch event listeners to window');
      window.addEventListener('touchstart', handleTouchStart, { passive: true });
      window.addEventListener('touchend', handleTouchEnd, { passive: true });
      window.addEventListener('touchmove', (e) => {
        console.log('Touch move event', e);
      }, { passive: true });
    };

    onMounted(() => {
      initializeEpubViewer();
      window.addEventListener('resize', adjustViewerHeight);
    });

    onUnmounted(() => {
      if (rendition.value) {
        rendition.value.off('touchstart', handleTouchStart);
        rendition.value.off('touchend', handleTouchEnd);
      }
      if (book.value) {
        book.value.destroy();
      }
      document.removeEventListener('keyup', handleKeyPress);
      window.removeEventListener('resize', adjustViewerHeight);
    });

    watch(() => props.book, loadBook);
    watch(() => props.book, initializeEpubViewer);


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
        // getChapterSummaries();
        getAllSummaries();
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
      getBookSummary,
      processEpub,
      nextSummaryPage,
      prevSummaryPage,
      currentSummaryContent,
      isProcessing,
      progress,
      summaryType,
      generatePlaceholderSummaries,
      epubViewerRef,
      epubViewerHeight,
      mobileEpubViewerHeight,
      // headerHeight: props.headerHeight
    };
  }
}
</script>

<style scoped>
.reading-area {
  height: 100%;
  display: flex;
  flex-direction: column;
}

#epub-viewer {
  height: v-bind(epubViewerHeight);
  overflow-y: auto;
  transition: opacity 0.3s ease;

}

footer {
  flex-shrink: 0;
}

@media (max-width: 640px) {
  #epub-viewer {
    height: v-bind(mobileEpubViewerHeight);
    transition: opacity 0.3s ease;

  }

#epub-viewer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

#epub-viewer.tapped::before {
  opacity: 1;
}
}
</style>