import UploadZone from "./components/UploadZone";

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          ConvertPicture
        </h1>
        <UploadZone />

      </div>

    </div>
  )
}
export default App
