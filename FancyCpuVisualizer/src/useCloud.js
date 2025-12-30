// src/useCloud.js
import { ref } from 'vue';
import { db, auth } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

//
//這個函式會遞迴檢查物件，把 undefined 的 expanded 補成 false，並移除其他 undefined 欄位
const sanitizeProjectData = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(v => sanitizeProjectData(v));
  } 
  // 如果是物件 (且不是 null)
  else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      let value = obj[key];
      
      if (key === 'expanded' && value === undefined) {
        value = false;
      }

      // 繼續遞迴處理子屬性
      const cleanValue = sanitizeProjectData(value);

      // 只有當值不是 undefined 時，才放進回傳的物件中
      if (cleanValue !== undefined) {
        acc[key] = cleanValue;
      }
      return acc;
    }, {});
  }
  // 基本型別直接回傳
  return obj;
};

export function useCloud() {
  const publicProjects = ref([]);
  const myProjects = ref([]);
  const isLoading = ref(false);

  //儲存專案
  async function saveToCloud(projectData, title, description, isPublic) {
    if (!auth.currentUser) return alert("請先登入！");
    isLoading.value = true;
    
    try {
      //
      //console.log("正在清洗資料以修復 undefined 錯誤...");
      const cleanContent = sanitizeProjectData(projectData);

      const docRef = await addDoc(collection(db, "projects"), {
        title,
        description,
        isPublic,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || "Anonymous",
        content: cleanContent, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      alert("儲存成功！");
      fetchMyProjects(); // 更新列表
    } catch (e) {
      console.error("Error adding document: ", e);
      //console.log("原始資料:", projectData); 
      alert("儲存失敗: " + e.message);
    } finally {
      isLoading.value = false;
    }
  }

  //工作坊
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

  //讀取我的專案
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

  //刪除專案
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
