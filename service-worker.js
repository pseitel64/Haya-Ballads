const CACHE_NAME = 'haya-ballads-v1';

const FILES_TO_CACHE = [
  '/library.html',
  // Audio files (Internet Archive)
  'https://archive.org/download/kajango/Kaitaba.m4a',
  'https://archive.org/download/kajango/kitekere.m4a',
  'https://archive.org/download/kajango/mugasha1.m4a',
  'https://archive.org/download/kajango/mugasha2.m4a',
  'https://archive.org/download/kajango/MbaliOluga.m4a',
  'https://archive.org/download/kajango/rukiza.m4a',
  'https://archive.org/download/kajango/kachwenyanja.m4a',
  'https://archive.org/download/kajango/kaiyula.m4a',
  'https://archive.org/download/kajango/kajango.m4a',
  'https://archive.org/download/Mwata/Mwata.m4a',



  // Viewer assets
  '/viewer/styles.css',
  '/viewer/library.css',
  '/viewer/script.js',
  '/viewer/navigation.js',
  '/viewer/poetic_forms.json',

  // Essays
  '/essays/haya_people.html',
  '/essays/enanga_tradition.html',
  '/essays/recording_methodology.html',
  '/essays/heroic_age.html',
  '/essays/call_episode.html',
  '/essays/bards_voices.html',
  '/essays/poetic_forms.html',

  // Library images
  '/images/0018-15Olwesho1.jpg',
  '/images/0054-4FezaTunes.jpg',
  '/images/0054-8Enanga.jpg',
  '/images/010-31aRojaboEnanga.jpg',
  '/images/016-30Enoch.jpg',
  '/images/cattlecountry.jpg',
  '/images/DioniesMsonge.jpg',
  '/images/Elias_Kashula_and_Winifred_Kisiraga_at_work_on_this_project_in_1969.jpg',
  '/images/Joeli1.jpg',

  // Feza - Kaitaba
  '/Feza - Kaitaba/index.html',
  '/Feza - Kaitaba/intro.html',
  '/Feza - Kaitaba/annotations.json',
  '/Feza - Kaitaba/sync.json',
  '/Feza - Kaitaba/transcription.json',
  '/Feza - Kaitaba/translation.json',
  '/Feza - Kaitaba/kaitaba_plot.json',
  '/Feza - Kaitaba/kaitaba_full_text.pdf',

  // Fezza - Kitekele
  '/Fezza - Kitekele/index.html',
  '/Fezza - Kitekele/intro.html',
  '/Fezza - Kitekele/annotations.json',
  '/Fezza - Kitekele/sync.json',
  '/Fezza - Kitekele/transcription.json',
  '/Fezza - Kitekele/translation.json',
  '/Fezza - Kitekele/kitekele_plot.json',
  '/Fezza - Kitekele/kitekele_full_text.pdf',

  // Habib - Mugasha I
  '/Habib - Mugasha I/index.html',
  '/Habib - Mugasha I/intro.html',
  '/Habib - Mugasha I/annotations.json',
  '/Habib - Mugasha I/sync.json',
  '/Habib - Mugasha I/transcription.json',
  '/Habib - Mugasha I/translation.json',
  '/Habib - Mugasha I/mugasha_i_plot.json',
  '/Habib - Mugasha I/mugasha_I_full_text.pdf',

  // Habib - Mugasha II
  '/Habib - Mugasha II/index.html',
  '/Habib - Mugasha II/intro.html',
  '/Habib - Mugasha II/annotations.json',
  '/Habib - Mugasha II/sync.json',
  '/Habib - Mugasha II/transcription.json',
  '/Habib - Mugasha II/translation.json',
  '/Habib - Mugasha II/mugasha_II_full_text.pdf',

  // Mugasha - Mbali
  '/Mugasha - Mbali/index.html',
  '/Mugasha - Mbali/intro.html',
  '/Mugasha - Mbali/annotations.json',
  '/Mugasha - Mbali/sync.json',
  '/Mugasha - Mbali/transcription.json',
  '/Mugasha - Mbali/translation.json',
  '/Mugasha - Mbali/mbali_plot.json',
  '/Mugasha - Mbali/mbali_full_text.pdf',

  // Mugasha - Rukiza
  '/Mugasha - Rukiza/index.html',
  '/Mugasha - Rukiza/intro.html',
  '/Mugasha - Rukiza/annotations.json',
  '/Mugasha - Rukiza/sync.json',
  '/Mugasha - Rukiza/transcription.json',
  '/Mugasha - Rukiza/translation.json',
  '/Mugasha - Rukiza/rukiza_plot.json',
  '/Mugasha - Rukiza/rukiza_full_text.pdf',

  // Muzee - Kachwenyanja
  '/Muzee - Kachwenyanja/index.html',
  '/Muzee - Kachwenyanja/intro.html',
  '/Muzee - Kachwenyanja/annotations.json',
  '/Muzee - Kachwenyanja/sync.json',
  '/Muzee - Kachwenyanja/transcription.json',
  '/Muzee - Kachwenyanja/translation.json',
  '/Muzee - Kachwenyanja/kachwenyanja_plot.json',
  '/Muzee - Kachwenyanja/kachwenyanja_full_text.pdf',

  // Muzee - Kaiyula
  '/Muzee - Kaiyula/index.html',
  '/Muzee - Kaiyula/intro.html',
  '/Muzee - Kaiyula/annotations.json',
  '/Muzee - Kaiyula/sync.json',
  '/Muzee - Kaiyula/transcription.json',
  '/Muzee - Kaiyula/translation.json',
  '/Muzee - Kaiyula/kaiyula_plot.json',
  '/Muzee - Kaiyula/kaiyula_full_text.pdf',

  // Muzee - Kajango
  '/Muzee - Kajango/index.html',
  '/Muzee - Kajango/intro.html',
  '/Muzee - Kajango/annotations.json',
  '/Muzee - Kajango/sync.json',
  '/Muzee - Kajango/transcription.json',
  '/Muzee - Kajango/translation.json',
  '/Muzee - Kajango/kajango_plot.json',
  '/Muzee - Kajango/kajango_full_text.pdf',
  '/Muzee - Kajango/images/bananabastbundle76small.jpg',
  '/Muzee - Kajango/images/beercanoe21-a.jpg',
  '/Muzee - Kajango/images/beercanoefunnelladleclose007A-7.jpg',
  '/Muzee - Kajango/images/beercanoefunnelladleKato007A-8.jpg',
  '/Muzee - Kajango/images/beercanoemashmedium007A-1.jpg',
  '/Muzee - Kajango/images/beercanoemashmediumrope007A-2.jpg',
  '/Muzee - Kajango/images/beercanoesievemash007A-16.jpg',
  '/Muzee - Kajango/images/beercanoesievemashmedium007A-6.jpg',
  '/Muzee - Kajango/images/beercanoesieverope007A-12.jpg',
  '/Muzee - Kajango/images/beercanoeuse007A-23.jpg',
  '/Muzee - Kajango/images/cookingpotonhearth19small.jpg',
  '/Muzee - Kajango/images/engemeko.jpg',
  '/Muzee - Kajango/images/spearandhaftedknife.jpg',

  // Muzee - The Tree Mwata
  '/Muzee - The Tree Mwata/index.html',
  '/Muzee - The Tree Mwata/intro.html',
  '/Muzee - The Tree Mwata/annotations.json',
  '/Muzee - The Tree Mwata/sync.json',
  '/Muzee - The Tree Mwata/transcription.json',
  '/Muzee - The Tree Mwata/translation.json',
  '/Muzee - The Tree Mwata/the_tree_mwata_plot.json',
  '/Muzee - The Tree Mwata/The_Tree_Mwata_full_text.pdf',
];

// Install: cache all files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching all files');
      // Cache in batches to avoid overwhelming the browser
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < FILES_TO_CACHE.length; i += batchSize) {
        batches.push(FILES_TO_CACHE.slice(i, i + batchSize));
      }
      return batches.reduce((chain, batch) => {
        return chain.then(() =>
          Promise.allSettled(batch.map(url =>
            cache.add(url).catch(err =>
              console.warn('[SW] Failed to cache:', url, err)
            )
          ))
        );
      }, Promise.resolve());
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache any new successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        console.warn('[SW] Network failed for:', event.request.url);
      });
    })
  );
});
