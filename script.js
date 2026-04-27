function randomHex() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

function ColorChangeApp() {
  const [bgColor, setBgColor] = React.useState('#ffffff');

  React.useEffect(() => {
    document.body.style.backgroundColor = bgColor;
  }, [bgColor]);

  return (
    <button onClick={() => setBgColor(randomHex())}>
      Change Color
    </button>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ColorChangeApp />);
