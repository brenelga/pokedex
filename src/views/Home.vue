<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-red-600 border-b-8 border-black p-6 shadow-xl">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 class="text-white text-3xl font-black tracking-tighter uppercase flex items-center gap-2">
          <div class="w-8 h-8 bg-white rounded-full border-4 border-black relative">
            <div class="absolute inset-1 border-2 border-black rounded-full"></div>
          </div>
          Pokédex MX
        </h1>
        
        <div class="relative w-full md:w-96">
          <input 
            v-model="filters.name"
            type="text" 
            placeholder="Buscar Pokémon" 
            class="w-full px-4 py-2 rounded-full border-2 border-black focus:outline-none focus:ring-4 focus:ring-red-300"
          />
        </div>
      </div>
    </header>

    <nav class="bg-black text-white p-4 sticky top-0 z-10 shadow-lg">
      <div class="max-w-7xl mx-auto flex flex-wrap gap-4 justify-center">
        <select v-model="filters.type1" class="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm">
          <option value="">Tipo 1</option>
          <option v-for="type in types" :key="type" :value="type">{{ type }}</option>
        </select>

        <select v-model="filters.type2" class="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm">
          <option value="">Tipo 2</option>
          <option v-for="type in types" :key="type" :value="type">{{ type }}</option>
        </select>

        <select v-model="filters.region" class="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm">
          <option value="">Todas las Regiones</option>
          <option value="kanto">Kanto</option>
          <option value="johto">Johto</option>
          <option value="hoenn">Hoenn</option>
          <option value="sinnoh">Sinnoh</option>
          <option value="unova">Unova</option>
          <option value="kalos">Kalos</option>
          <option value="alola">Alola</option>
          <option value="galar">Galar</option>
        </select>

        <button @click="applyFilters" class="bg-red-600 hover:bg-red-500 px-4 py-1 rounded font-bold transition">
          Filtrar
        </button>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto p-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div v-for="p in pokemonList" :key="p.id" 
          class="bg-white border-4 border-black rounded-2xl overflow-hidden hover:transform hover:-translate-y-2 transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div class="bg-red-50 p-4 flex justify-center border-b-4 border-black relative">
            <span class="absolute top-2 left-2 font-black text-black opacity-20 text-2xl">#{{ p.id }}</span>
            <img :src="p.image" :alt="p.name" class="w-32 h-32 object-contain" />
          </div>
          <div class="p-4 text-center">
            <h2 class="text-xl font-black uppercase text-gray-800">{{ p.name }}</h2>
            <div class="flex justify-center gap-2 mt-2">
              <span v-for="t in p.types" :key="t" class="px-3 py-1 rounded-full text-[10px] font-bold uppercase border-2 border-black bg-white">
                {{ t }}
              </span>
            </div>
            <button class="mt-4 w-full bg-black text-white py-2 rounded-lg font-bold hover:bg-gray-800 transition">
              Ver Detalles
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>

</script>