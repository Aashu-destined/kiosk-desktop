this file is to discuss the changes in the core logic of the s/w

I've a Bank of Baroda (BoB) kiyosk shop, along with photocopy print, form filling etc.
I want to manage my transections between the three accounts cash(in hand), bank account , OD account
1. the relation of transection to each account is as follow-
    1.1 Money_related transections    
        --through kiyosk:
            --- Money withdrawn (transetion type) then cash will be debited, OD account will be credited
                ----this transection type can be of two type on-us or off-us
        --through phonepay:
            --- Money withdrawn (transection type) then cash will be debited, Bank account will be credited
            --- Money deposit (transection type) then cash will be credited, bank account will be debited
    1.2 -other services like photocopy/print/form fill etc transections
        --for any type it will take money in value in cash or digital, accoding to this either cash or bank ac will be credited; and will take money out value in cash or digital, according to that either cash or bank ac will be debited. the difference in the debited and credited amount will be treated as money-charged for the service and that will be handled as sec 3.

2. in each transection I charge money from the customer (except when transection is through kiyosh -> money withdrawn -> transection type is 'on-us' ) the amount charged and this charged-money is credited to which account vary transection to transection as follow 
	-when customer gives charged-money as cash apart from the transection money then this charged-money is credited to cash.
	
3. when there is difference in the amount credited and amount debited then the difference extra amount should be treated as charged-money which will be settled as follow
	-when transection is done through phonepay then difference amount will be credited to bank account
	-when transection is done through kiyosk then difference amount will be credited to cash account

4. I've to take care that cash and bank account should have enough liquid money so I can rotate it. for that if needed I rebalance the money between cash, bank account and OD account (withdrawing from one deposting to another) usualy this type of senerio happens
    - cash account have low money so have to withdraw from money from OD or bank where the the money is exess, to continue the bussines transections
    - bank account have low money so have to withdraw money from OD or bank account  where the the money is exess, to continue the bussines transections
    - it is rare case where OD account have low money so usually there is no need to deposit money in the OD account during rebalancing because most customers withdraw money from kiyosk and rerely deposite, so most of the transection the OD account is credited and excess money is dumped in the OD account. 
