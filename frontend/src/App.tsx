import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CssBaseline } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import MainLayout from "./components/layout/MainLayout";
import { AuthGuard } from "./components/AuthGuard";
import Login from "./components/pages/Login";   // ✅ FIXED PATH

import "./App.css";



import { ThemeContextProvider } from "./contexts/ThemeContext";


const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContextProvider>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                path="/*"
                element={
                  <AuthGuard>
                    <MainLayout />
                  </AuthGuard>
                }
              />

            </Routes>
          </Router>
        </LocalizationProvider>
      </ThemeContextProvider>
    </QueryClientProvider>
  );
}

export default App;
