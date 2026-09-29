COPY     START   1000
FIRST    LDA     NUM1
         ADD     NUM2
         STA     RESULT
         RSUB
NUM1     WORD    10
NUM2     WORD    20
RESULT   RESW    1
         END     FIRST
