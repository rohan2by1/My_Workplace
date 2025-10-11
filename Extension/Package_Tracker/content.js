
// Wait for page to fully load
window.addEventListener('load', () => {
  console.log('Page loaded, searching for buttons to click...');
  
  const hostname = window.location.hostname;
  let attempts = 0;
  const maxAttempts = 15;
  
  const clickInterval = setInterval(() => {
    attempts++;
    let button = null;
    
    // USPS specific selectors
    if (hostname.includes('usps.com')) {
      button = 
        document.querySelector('button[type="submit"]') ||
        document.querySelector('.tracking-submit') ||
        document.querySelector('#trackButton') ||
        Array.from(document.querySelectorAll('button')).find(btn => 
          btn.textContent.includes('Track') || btn.textContent.includes('Search')
        );
    }
    
    // UPS specific selectors
    else if (hostname.includes('ups.com')) {
      button = 
        document.querySelector('button[data-strat-action="track"]') ||
        document.querySelector('.ups-button') ||
        document.querySelector('#track-button') ||
        Array.from(document.querySelectorAll('button')).find(btn => 
          btn.textContent.includes('Track') || btn.textContent.includes('Submit')
        );
    }
    
    if (button) {
      console.log('Found button, clicking in 1 second...');
      // Wait a bit before clicking to ensure page is ready
      setTimeout(() => {
        button.click();
        console.log('Button clicked!');
      }, 1000);
      clearInterval(clickInterval);
    } else if (attempts >= maxAttempts) {
      console.log('No button found after', maxAttempts, 'attempts - page may auto-load');
      clearInterval(clickInterval);
    }
  }, 500); // Check every 500ms
});
