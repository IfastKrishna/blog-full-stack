// src/components/LoginForm.js
import React from "react";

const LoginPage = () => {
  return (
    <div className="flex justify-center items-center h-screen bg-gray-900">
      <form className="bg-gray-800 p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-semibold text-white mb-4">Login</h2>
        <div className="mb-4">
          <label className="block text-white mb-2" htmlFor="username">
            Username
          </label>
          <input
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            type="text"
            id="username"
          />
        </div>
        <div className="mb-6">
          <label className="block text-white mb-2" htmlFor="password">
            Password
          </label>
          <input
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            type="password"
            id="password"
          />
        </div>
        <button
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg"
          type="submit"
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
