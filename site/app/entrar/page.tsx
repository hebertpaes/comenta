export default function EntrarPage() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.location.href = 'http://localhost:5173';`,
      }}
    />
  );
}
