# TODO

- rebrand: rename to MaxMemory, update extension code, update chrome extension listing, popup.html, new firebase website, done 
    

- accounts : add accounts and authentication with firebase to extension 
        added firebase auth to extension using dev oauth token, done
        move authentication stuff to background script, done 
        add user record to firestore upon joining, done
        add subscription status UI to popup, done

- payment: integrate gumroad payment, update accounts as paid 
        add authentication to webapp with custom token, done 
        add purchase page on web app, done 
        implement webhook for payment processing in backend and update user subscription status, done 
        add redirection page after payment 

- backup memories: setup pinecone vector database, backup memories on it for paid users. 
- gemini: paid users don't have to use their own gemini key

- pricing : add pricing page on both webapp and extension 

- analytics : add way to better track what users are doing, which sites are they using the extension on
- feedback : setup page on founderline with updated info