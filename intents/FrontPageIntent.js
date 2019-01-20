const snoowrap = require('snoowrap')
const format = require('../helpers/format')
const utils = require('../helpers/utils')
const document = require('../APL/document').pagerDocument

const FrontPageHandler = {
  canHandle (handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
           handlerInput.requestEnvelope.request.intent.name === 'FrontPageIntent'
  },
  handle (handlerInput) {
    const accessToken = handlerInput.requestEnvelope.context.System.user.accessToken
    let sortSlot
    if (handlerInput.requestEnvelope.request.intent.slots.sort) {
      sortSlot = handlerInput.requestEnvelope.request.intent.slots.Sort.value
    }
    
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes()
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    
    if (!utils.supportsAPL(handlerInput)) {
      return handlerInput.responseBuilder
        .speak(requestAttributes.t('APL_REQUIRED'))
        .getResponse();
    }

    if (!utils.accountUnlinked(handlerInput)) {
      return handlerInput.responseBuilder
        .speak(requestAttributes.t('ACCOUNT_UNLINKED'))
        .withLinkAccountCard()
        .getResponse();
    }

    return (async function () {

      let posts
      let cardTitle = 'Reddit'
      try {
        let r = new snoowrap({
          userAgent: 'Alexa for Reddit',
          accessToken: accessToken
        })
        console.log('sortSlot',sortSlot)
        if (sortSlot == 'hot') {
          posts = await r.getHot(null, {limit: 10})
        } else if (sortSlot == 'new'){
          posts = await r.getNew(null, {limit: 10})
        } else if (sortSlot == 'controversial'){
          posts = await r.getControversial(null, {limit: 10})
        } else if (sortSlot == 'top'){
          posts = await r.getTop(null, {limit: 10})
        } else if (sortSlot == 'rising'){
          posts = await r.getRising(null, {limit: 10})
        } else if (sortSlot == 'best'){
          posts = await r.oauthRequest(null, {limit: 10})
        } else {
          posts = await r.getHot(null, {limit: 10})
        }

        let postData = await format.pagerList(posts)

        let hintText = requestAttributes.t('HINT_MESSAGE')
        let data = { 
          "postData": {
            "type": "object",
            "data": postData
          },
          "hint": {
            "type": "string",
            "string": hintText[Math.floor(Math.random() * hintText.length)]
          }
        }
        
        let speakOutput = `<speak>${requestAttributes.t('FRONT_PAGE')}</speak>`

        sessionAttributes.speakOutput = speakOutput
        sessionAttributes.repromptSpeech = requestAttributes.t('REPEAT_MESSAGE');
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes)

        return handlerInput.responseBuilder
          // .speak(sessionAttributes.speakOutput) 
          // .reprompt(sessionAttributes.repromptSpeech)
          .addDirective({
            type : 'Alexa.Presentation.APL.RenderDocument',
            token: 'pagerToken',
            document : document,
            datasources: data
          })
          // .withSimpleCard(cardTitle, sessionAttributes.speakOutput)
          .withShouldEndSession(false)
          .getResponse()
        
      } catch (error) {
        console.log('ERROR: ', error)
        speakOutput = `<speak> ${requestAttributes.t('ERROR_MESSAGE')} </speak>`
        sessionAttributes.speakOutput = speakOutput
        sessionAttributes.repromptSpeech = requestAttributes.t('REPROMPT')
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes)

        return handlerInput.responseBuilder
          .speak(sessionAttributes.speakOutput)
          .reprompt(sessionAttributes.repromptSpeech)
          .getResponse()
      }
    })()
  }
}

module.exports = {
  FrontPageHandler
}
