# TODO

- rebrand: rename to MaxMemory, update extension code, update chrome extension listing, popup.html, new firebase website, done 
    

- accounts : add accounts and authentication with firebase to extension 
        added firebase auth to extension using dev oauth token, done
        move authentication stuff to background script, done 
        add user record to firestore upon joining, done
        add subscription status UI to popup, done

- payment: integrate gumroad payment, update accounts as paid 
        create subscription management page
        implement webhook for payment processing
        update user subscription status in firestore

- backup memories: backup memories on the cloud, link them to your account, fetch memories, use proper vector database
- gemini: paid users don't have to use their own gemini key

- analytics : add way to better track what users are doing, which sites are they using the extension on
- feedback : setup page on founderline with updated info