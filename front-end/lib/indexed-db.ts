// IndexedDB bilan ishlash uchun yordamchi funksiyalar

// IndexedDB-ni ochish
export function openDB(dbName: string, version = 1): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version)

    request.onerror = (event) => {
      reject("IndexedDB xatosi: " + (event.target as IDBOpenDBRequest).error)
    }

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // PDF nashrlar uchun store yaratish
      if (!db.objectStoreNames.contains("publications")) {
        db.createObjectStore("publications", { keyPath: "id" })
      }
    }
  })
}

// Ma'lumotlarni saqlash
export async function saveData(dbName: string, storeName: string, data: any): Promise<void> {
  const db = await openDB(dbName)

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite")
    const store = transaction.objectStore(storeName)
    const request = store.put(data)

    request.onerror = (event) => {
      reject("Saqlashda xatolik: " + (event.target as IDBRequest).error)
    }

    request.onsuccess = () => {
      resolve()
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

// Ma'lumotlarni o'qish
export async function getData(dbName: string, storeName: string, key: string): Promise<any> {
  const db = await openDB(dbName)

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly")
    const store = transaction.objectStore(storeName)
    const request = store.get(key)

    request.onerror = (event) => {
      reject("O'qishda xatolik: " + (event.target as IDBRequest).error)
    }

    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result)
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

// Barcha ma'lumotlarni o'qish
export async function getAllData(dbName: string, storeName: string): Promise<any[]> {
  const db = await openDB(dbName)

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly")
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onerror = (event) => {
      reject("O'qishda xatolik: " + (event.target as IDBRequest).error)
    }

    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result)
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

// Ma'lumotlarni o'chirish
export async function deleteData(dbName: string, storeName: string, key: string): Promise<void> {
  const db = await openDB(dbName)

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite")
    const store = transaction.objectStore(storeName)
    const request = store.delete(key)

    request.onerror = (event) => {
      reject("O'chirishda xatolik: " + (event.target as IDBRequest).error)
    }

    request.onsuccess = () => {
      resolve()
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}
