// src/useCloud.js
import { ref } from 'vue';
import { db, auth } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

export function useCloud() {
  const publicProjects = ref([]);
  const myProjects = ref([]);
  const isLoading = ref(false);

  // 1. 儲存專案 (Create/Update)
  async function saveToCloud(projectData, title, description, isPublic) {
    if (!auth.currentUser) return alert("請先登入！");
    isLoading.value = true;
    
    try {
      const docRef = await addDoc(collection(db, "projects"), {
        title,
        description,
        isPublic,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || "Anonymous",
        content: projectData, // 這是你原本 saveProject 的那個大 JSON 物件
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      alert("儲存成功！");
      fetchMyProjects(); // 更新列表
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("儲存失敗");
    } finally {
      isLoading.value = false;
    }
  }

  // 2. 讀取工作坊專案 (Workshop - Read Public)
  async function fetchPublicProjects() {
    isLoading.value = true;
    try {
      const q = query(
        collection(db, "projects"), 
        where("isPublic", "==", true),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      publicProjects.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error(e);
    } finally {
      isLoading.value = false;
    }
  }

  // 3. 讀取我的專案 (Read Own)
  async function fetchMyProjects() {
    if (!auth.currentUser) return;
    isLoading.value = true;
    try {
      const q = query(
        collection(db, "projects"), 
        where("authorId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      myProjects.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error(e);
    } finally {
      isLoading.value = false;
    }
  }

  // 4. 刪除專案 (Delete)
  async function deleteProject(id) {
    if (!confirm("確定要刪除嗎？")) return;
    try {
      await deleteDoc(doc(db, "projects", id));
      myProjects.value = myProjects.value.filter(p => p.id !== id);
    } catch (e) {
      console.error(e);
      alert("刪除失敗");
    }
  }

  return {
    publicProjects,
    myProjects,
    isLoading,
    saveToCloud,
    fetchPublicProjects,
    fetchMyProjects,
    deleteProject
  };
}