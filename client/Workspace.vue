<script setup>
import { ref, onMounted } from "vue";
import { api, act } from "./api";
const keys = ref([]),
  requests = ref([]),
  name = ref("Demo istemcisi"),
  capacity = ref(3),
  secret = ref(""),
  response = ref("");
async function load() {
  [keys.value, requests.value] = await Promise.all([
    api("/keys"),
    api("/requests"),
  ]);
}
async function call() {
  const r = await fetch("/gateway/demo", {
    headers: { "x-api-key": secret.value },
  });
  response.value =
    "HTTP " + r.status + "\n" + JSON.stringify(await r.json(), null, 2);
  await load();
}
onMounted(() => act(load, ""));
</script>
<template>
  <div class="grid">
    <form
      class="panel"
      @submit.prevent="
        act(async () => {
          const r = await api('/keys', 'POST', { name, capacity });
          secret = r.secret;
          await load();
        }, 'Anahtar üretildi; gizli değer yalnız bu yanıtta gösterilir')
      "
    >
      <h2>API anahtarı oluştur</h2>
      <label>İstemci adı<input v-model="name" required /></label
      ><label
        >Token kapasitesi<input
          v-model.number="capacity"
          type="number"
          min="1"
          max="100" /></label
      ><button>Oluştur</button>
      <p class="muted">
        Her saniye 1 token eklenir; kapasite aşılmaz. Kota her anahtar için
        ayrıdır.
      </p>
    </form>
    <section class="panel">
      <h2>Proxy test konsolu</h2>
      <label>X-API-Key<input v-model="secret" autocomplete="off" /></label
      ><button :disabled="!secret" @click="act(call, '')">
        GET /gateway/demo
      </button>
      <pre v-if="response">{{ response }}</pre>
      <small>Hızlı tıklamalarla HTTP 429 yanıtını gözlemle.</small>
    </section>
  </div>
  <section class="panel">
    <h2>Anahtarlar</h2>
    <div class="card" v-for="k in keys">
      {{ k.name }} · kapasite {{ k.capacity }} ·
      {{ k.active ? "Aktif" : "Kapalı" }}
      <button
        class="ghost small"
        @click="
          act(async () => {
            await api('/keys/' + k.id, 'DELETE');
            await load();
          })
        "
      >
        İptal et
      </button>
    </div>
  </section>
  <section class="panel">
    <h2>Son 100 istek</h2>
    <div class="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Zaman</th>
            <th>Anahtar</th>
            <th>HTTP</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in requests">
            <td>{{ r.at }}</td>
            <td>{{ r.key_id.slice(0, 8) }}</td>
            <td>{{ r.status }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
