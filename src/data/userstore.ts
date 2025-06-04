import { failureResult, successResult, type Result } from "../lib/utils";
import { getUserById, signInWithEmailAndPassword, supabase } from "./supabaseclient";
import type { UserData } from "./types";
import {create } from "zustand"




export interface UserStore {
    userData: UserData | undefined;
    setActiveRoleAndName: (role: string, name: string) => void
    getActiveRoleAndName: () => (string | undefined)[]
    signIn: (email: string, password: string) => Promise<boolean >;
    refreshUser: () => Promise<void>;
    signOut: () => Promise<void>;
    init: () => () => void;

}


  function getInitialUserData() {
    try {
      // Fetch the stored data from localStorage
      const userString = localStorage.getItem("user");
      const storedString = localStorage.getItem("stored");
  
      // Parse the JSON strings into objects
      const user = userString ? JSON.parse(userString) : null;
      const stored = storedString ? JSON.parse(storedString) : null;  
      // Validate the data and return UserData if valid
      if (user && stored && user.user.id === stored.user_id) {
        return {
          user: user.user, // Access the nested user object
          stored: {
            ...stored,
            activeRole: stored.activeRole ?? null,
          },

        };
      }
    } catch (error) {
      console.error("Error parsing localStorage data:", error);
    }
    return undefined;
  }


   export const useUserStore = create<UserStore>((set, get) => ({
    userData: getInitialUserData(),
    lists: [],
    init: () => {


      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        console.log(event, session)

         if (event === "SIGNED_IN") {
          // handle sign in event
          get()
            .refreshUser()
 
        } else if (event === "SIGNED_OUT") {
          localStorage.removeItem("user")
          localStorage.removeItem("stored")
          set({
            userData: undefined,
          });
        } else if (event === "PASSWORD_RECOVERY") {
          // handle password recovery event
        } else if (event === "TOKEN_REFRESHED") {
          // handle token refreshed event
        } else if (event === "USER_UPDATED") {
          // handle user updated event
          get().refreshUser();
        }
      })
      initializeUser().then((result) => {
        if (!result.ok) {
          localStorage.removeItem("user")
          localStorage.removeItem("stored")
          return
        }
        localStorage.setItem("user", JSON.stringify(result.data.user))
        localStorage.setItem("stored", JSON.stringify(result.data.stored))
        set({
          userData: result.data,
        });
  
        get()
      });
      return data.subscription.unsubscribe
    },
    signIn: async (email: string, password: string) => {
      const result = await signInWithEmailAndPassword(email, password);
      const name = get().userData?.stored.name ?? null
      if(result) {
        const stored = await getUserById(result.user.id, name)
        if (!stored) {
          console.warn("User ID not found in database");
          return false;
        }
        set({
          userData: {
            user: result.user,
            stored: stored,
          }
        })
        get()
        return true
      }
      return false
    },

    setActiveRoleAndName: (role: string, name: string) => {
        const current = get().userData;
        if (!current) return;

        const updatedStored = { ...current.stored, activeRole: role, name: name};
        localStorage.setItem("stored", JSON.stringify(updatedStored));

        set({
            userData: {
            ...current,
            stored: updatedStored,
            },
        });
    },

    getActiveRoleAndName: () => {
        const ret = [get().userData?.stored.activeRole?.toString(), get().userData?.stored.name?.toString()]
        return ret
    },
  
    refreshUser: async () => {
      const { data, error } = await supabase.auth.getUser();
      const name = get().userData?.stored.name ?? null
      if (error) {
        console.error("Error fetching user:", error.message);
        return;
      }
      const id = data.user?.id;
      if (!id) {
        console.warn("No user ID found");
        return;
      }
      const stored = await getUserById(id, name);
      if (!stored) {
        console.warn("User ID not found in database");
        return;
      }
      // Overwrite localStorage with the latest data
      localStorage.setItem("user", JSON.stringify({ user: data.user }));
      localStorage.setItem("stored", JSON.stringify(stored));
      set({
        userData: {
          user: data.user,
          stored: stored,
        },
      });
    },
  
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign-out error:", error.message);
        return;
      }

    localStorage.removeItem("user");
    localStorage.removeItem("stored");
      set({
        userData: undefined,
      });
    },
    
  }))

  async function initializeUser(): Promise<Result<UserData, unknown>> {
    const user = await supabase.auth.getUser();
    if (user.error) {
      return failureResult(user.error);
    }

    return successResult({
      user: user.data.user,
      stored: {
        email: user.data.user.email || "", 
        profile_image: "",
        user_id: user.data.user.id, 
        username: user.data.user.email?.split("@")[0] || "unknown",
        activeRole: null,
        name: null
      },
    });
  }