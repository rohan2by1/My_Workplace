// Wait for page to fully load
window.addEventListener('load', () => {
  console.log('Page loaded on checkorderid.com, searching for element...');
  
  let attempts = 0;
  const maxAttempts = 15;
  
  const clickInterval = setInterval(() => {
    attempts++;
    
    // Find the specific element with class "list-group-item pointer" and onclick="toggle(this)"
    let element = 
      // Try to find by exact class combination
      document.querySelector('div.list-group-item.pointer[onclick="toggle(this)"]') ||
      // Try without exact onclick match
      document.querySelector('div.list-group-item.pointer[onclick]') ||
      // Try just the classes
      document.querySelector('div.list-group-item.pointer') ||
      // Try all elements with these classes
      Array.from(document.querySelectorAll('div.list-group-item.pointer')).find(el => 
        el.getAttribute('onclick') === 'toggle(this)'
      ) ||
      // Backup: find any element with onclick="toggle(this)"
      document.querySelector('[onclick="toggle(this)"]');
    
    if (element) {
      console.log('Found element:', element);
      console.log('Element classes:', element.className);
      console.log('Element onclick:', element.getAttribute('onclick'));
      console.log('Clicking in 1 second...');
      
      // Wait a bit before clicking to ensure page is ready
      setTimeout(() => {
        element.click();
        console.log('Element clicked successfully!');
      }, 1000);
      
      clearInterval(clickInterval);
    } else if (attempts >= maxAttempts) {
      console.log('Element not found after', maxAttempts, 'attempts');
      console.log('The page structure might be different or element loads later');
      clearInterval(clickInterval);
    } else {
      console.log(`Attempt ${attempts}/${maxAttempts} - Still searching...`);
    }
  }, 500); // Check every 500ms
});
