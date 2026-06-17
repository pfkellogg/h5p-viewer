/* global H5PIntegration, H5PViewerConfig */
;(function () {
  'use strict'

  // ─── Utilities ────────────────────────────────────────────────────────────

  function safeJson(str) {
    if (!str) return null
    if (typeof str === 'object') return str
    try {
      return JSON.parse(str)
    } catch (e) {
      return null
    }
  }

  function machineName(library) {
    // library may be "H5P.MultiChoice 1.16" or just "H5P.MultiChoice"
    return (library || '').split(' ')[0]
  }

  function stripHtml(html) {
    var tmp = document.createElement('div')
    tmp.innerHTML = html || ''
    return tmp.textContent || tmp.innerText || ''
  }

  // ─── Per-type question extractors ─────────────────────────────────────────
  // Each extractor receives (params, location) and returns an array of:
  //   { location, question, answers: [{text, correct}], type }

  var extractors = {}

  // H5P.MultiChoice
  extractors['H5P.MultiChoice'] = function (params, loc) {
    var q = stripHtml(params.question || '')
    var answers = (params.answers || []).map(function (a) {
      return { text: stripHtml(a.text || ''), correct: !!a.correct }
    })
    return [{ location: loc, question: q, answers: answers, type: 'Multiple Choice' }]
  }

  // H5P.TrueFalse
  extractors['H5P.TrueFalse'] = function (params, loc) {
    var q = stripHtml(params.question || '')
    var correct = params.correct === 'true' ? 'True' : 'False'
    return [
      {
        location: loc,
        question: q,
        type: 'True / False',
        answers: [
          { text: 'True', correct: params.correct === 'true' },
          { text: 'False', correct: params.correct === 'false' }
        ]
      }
    ]
  }

  // H5P.Blanks (Fill in the Blanks)
  extractors['H5P.Blanks'] = function (params, loc) {
    return (params.questions || []).map(function (rawQ, idx) {
      var text = stripHtml(rawQ || '')
      // correct answers are the *value* inside *...*
      var answers = []
      var re = /\*([^*]+)\*/g,
        m
      while ((m = re.exec(rawQ)) !== null) {
        // multiple accepted: slash-separated
        m[1].split('/').forEach(function (a) {
          answers.push({ text: a.trim(), correct: true })
        })
      }
      return {
        location: loc + ' › Gap ' + (idx + 1),
        question: text.replace(/\*[^*]+\*/g, '_____'),
        answers: answers,
        type: 'Fill in the Blanks'
      }
    })
  }

  // H5P.SingleChoiceSet
  extractors['H5P.SingleChoiceSet'] = function (params, loc) {
    return (params.choices || []).map(function (choice, idx) {
      var q = stripHtml(choice.question || '')
      var answers = (choice.answers || []).map(function (a, ai) {
        return { text: stripHtml(a || ''), correct: ai === 0 } // first is always correct
      })
      return { location: loc + ' › Question ' + (idx + 1), question: q, answers: answers, type: 'Single Choice Set' }
    })
  }

  // H5P.DragQuestion
  extractors['H5P.DragQuestion'] = function (params, loc) {
    var taskDesc = stripHtml(params.taskDescription || '')
    var task = (params.question && params.question.task) || {}
    var elements = task.elements || []
    var items = []

    ;(task.dropZones || []).forEach(function (dz, di) {
      var dzLabel = stripHtml(dz.label || 'Drop Zone ' + (di + 1))
      var answers = (dz.correctElements || []).map(function (elId) {
        var el = elements[parseInt(elId, 10)]
        var text = el && el.type && el.type.params ? stripHtml(el.type.params.text || el.type.params.alt || String(elId)) : String(elId)
        return { text: text, correct: true }
      })

      // Also list the draggables that do NOT belong here as wrong options
      elements.forEach(function (el, ei) {
        var alreadyCorrect = (dz.correctElements || []).indexOf(String(ei)) !== -1
        if (!alreadyCorrect) {
          var text = el.type && el.type.params ? stripHtml(el.type.params.text || el.type.params.alt || 'Item ' + (ei + 1)) : 'Item ' + (ei + 1)
          answers.push({ text: text, correct: false })
        }
      })

      items.push({
        location: loc + ' › Drop Zone ' + (di + 1),
        question: taskDesc ? taskDesc + ' — ' + dzLabel : dzLabel,
        answers: answers,
        type: 'Drag and Drop'
      })
    })
    return items
  }

  // H5P.MarkTheWords
  extractors['H5P.MarkTheWords'] = function (params, loc) {
    var text = stripHtml(params.taskDescription || '')
    var body = params.textField || ''
    var words = []
    var re = /\*([^*]+)\*/g,
      m
    while ((m = re.exec(body)) !== null) {
      words.push({ text: m[1], correct: true })
    }
    return [
      {
        location: loc,
        question: text,
        answers: words.length ? words : [{ text: 'See marked text', correct: true }],
        type: 'Mark the Words'
      }
    ]
  }

  // H5P.Summary
  extractors['H5P.Summary'] = function (params, loc) {
    var intro = stripHtml(params.intro || 'Choose the correct statement')
    return (params.summaries || []).map(function (s, idx) {
      var answers = (s.summary || []).map(function (stmt, si) {
        return { text: stripHtml(stmt || ''), correct: si === 0 } // index 0 is always the correct statement
      })
      return {
        location: loc + ' › Part ' + (idx + 1),
        question: intro,
        answers: answers,
        type: 'Summary'
      }
    })
  }

  // H5P.Flashcards
  extractors['H5P.Flashcards'] = function (params, loc) {
    return (params.cards || []).map(function (card, idx) {
      return {
        location: loc + ' › Card ' + (idx + 1),
        question: stripHtml(card.text || ''),
        answers: [{ text: stripHtml(card.answer || ''), correct: true }],
        type: 'Flashcards'
      }
    })
  }

  // H5P.ImageHotspotQuestion
  extractors['H5P.ImageHotspotQuestion'] = function (params, loc) {
    var q = stripHtml(((params.taskDescription || {}).params && params.taskDescription.params.text) || 'Click on the correct hotspot')
    var hs = params.imageHotspotQuestion || {}
    return [
      {
        location: loc,
        question: q,
        answers: [{ text: 'Hotspot ' + ((hs.hotspot || {}).i || 1) + ' is correct', correct: true }],
        type: 'Image Hotspot'
      }
    ]
  }

  // ─── Container / composite type parsers ───────────────────────────────────

  /**
   * Recursively extract all questions from any H5P params object.
   * `library`  – machine name string e.g. "H5P.MultiChoice"
   * `params`   – parsed JSON params for that library
   * `location` – human-readable path, e.g. "Slide 2 › Element 3"
   */
  // Content types that are purely presentational — never shown in the inspector
  var SKIP_TYPES = {
    'H5P.Text': true,
    'H5P.AdvancedText': true,
    'H5P.Image': true,
    'H5P.Video': true,
    'H5P.Audio': true,
    'H5P.Table': true,
    'H5P.Link': true,
    'H5P.DocumentationTool': true
  }

  function extractAll(library, params, location) {
    var mn = machineName(library)
    var results = []

    // Skip purely presentational types
    if (SKIP_TYPES[mn]) return results

    // Direct extractor match
    if (extractors[mn]) {
      return extractors[mn](params, location)
    }

    // ── H5P.QuestionSet ───────────────────────────────────────────────────
    if (mn === 'H5P.QuestionSet') {
      ;(params.questions || []).forEach(function (q, idx) {
        var childLib = q.library || ''
        var childParams = safeJson(q.params) || q.params || {}
        var loc = location + ' › Question ' + (idx + 1)
        results = results.concat(extractAll(childLib, childParams, loc))
      })
      return results
    }

    // ── H5P.CoursePresentation ────────────────────────────────────────────
    if (mn === 'H5P.CoursePresentation') {
      var slides = (params.presentation && params.presentation.slides) || params.slides || []
      slides.forEach(function (slide, si) {
        var slideLoc = location + ' › Slide ' + (si + 1)
        ;(slide.elements || []).forEach(function (el, ei) {
          if (!el.action) return
          var elLib = el.action.library || ''
          var elParams = safeJson(el.action.params) || el.action.params || {}
          var elLoc = slideLoc + ' › Element ' + (ei + 1)
          results = results.concat(extractAll(elLib, elParams, elLoc))
        })
      })
      return results
    }

    // ── H5P.InteractiveVideo ──────────────────────────────────────────────
    if (mn === 'H5P.InteractiveVideo') {
      var ivAssets = (params.interactiveVideo && params.interactiveVideo.assets) || {}
      var interactions = (ivAssets.interactions || []).concat(params.interactionsWithoutPauses || []).concat(params.interactions || [])
      interactions.forEach(function (ia, ii) {
        if (!ia.action) return
        var iaLib = ia.action.library || ''
        var iaParams = safeJson(ia.action.params) || ia.action.params || {}
        var time = ia.duration ? ia.duration.from : ii
        var iaLoc = location + ' › Interaction @ ' + formatTime(time)
        var subCid = ia.action.subContentId || null
        var extracted = extractAll(iaLib, iaParams, iaLoc)
        if (extracted.length) {
          extracted.forEach(function (e) {
            e.timestamp = time
            e.subContentId = subCid
          })
          results = results.concat(extracted)
        } else if (!SKIP_TYPES[machineName(iaLib)]) {
          // Unknown/non-question type — include as a step so it shows as a dot
          var label = iaParams.contentName || iaParams.title || iaParams.alt || ''
          results.push({
            location: iaLoc,
            question: label ? stripHtml(label) : machineName(iaLib),
            answers: [],
            type: machineName(iaLib),
            isQuestion: false,
            timestamp: time,
            subContentId: subCid
          })
        }
      })
      results.sort(function (a, b) {
        return (a.timestamp || 0) - (b.timestamp || 0)
      })

      // ── IV end-of-video summary task ─────────────────────────────────────
      // Stored at interactiveVideo.summary.task, NOT inside assets
      var ivSummaryBlock = params.interactiveVideo && params.interactiveVideo.summary
      var ivSummary = ivSummaryBlock && ivSummaryBlock.task
      if (ivSummary && ivSummary.library) {
        var sLib    = ivSummary.library || ''
        var sParams = safeJson(ivSummary.params) || ivSummary.params || {}
        var sCid    = ivSummary.subContentId || null
        var sExtracted = extractAll(sLib, sParams, location + ' › End Summary')
        sExtracted.forEach(function (e) {
          e.timestamp   = Infinity
          e.subContentId = sCid
        })
        results = results.concat(sExtracted)
      }

      return results
    }

    // ── H5P.Column ────────────────────────────────────────────────────────
    if (mn === 'H5P.Column') {
      ;(params.content || []).forEach(function (item, idx) {
        if (!item.content) return
        var cLib = item.content.library || ''
        var cParams = safeJson(item.content.params) || item.content.params || {}
        var cLoc = location + ' › Item ' + (idx + 1)
        results = results.concat(extractAll(cLib, cParams, cLoc))
      })
      return results
    }

    // ── H5P.BranchingScenario ─────────────────────────────────────────────
    if (mn === 'H5P.BranchingScenario') {
      ;((params.branchingScenario && params.branchingScenario.content) || []).forEach(function (node, idx) {
        if (!node.type) return
        var nLib = node.type.library || ''
        var nParams = safeJson(node.type.params) || node.type.params || {}
        var nLoc = location + ' › Node ' + (idx + 1)
        results = results.concat(extractAll(nLib, nParams, nLoc))
      })
      return results
    }

    // ── H5P.Accordion ─────────────────────────────────────────────────────
    if (mn === 'H5P.Accordion') {
      ;(params.panels || []).forEach(function (panel, idx) {
        if (!panel.content || !panel.content.library) return
        var pLib = panel.content.library || ''
        var pParams = safeJson(panel.content.params) || panel.content.params || {}
        var pLoc = location + ' › Panel "' + stripHtml(panel.title || idx + 1) + '"'
        results = results.concat(extractAll(pLib, pParams, pLoc))
      })
      return results
    }

    return results
  }

  function formatTime(secs) {
    secs = Math.round(secs || 0)
    var m = Math.floor(secs / 60)
    var s = secs % 60
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s
  }

  // ─── Fetch DB metadata then build UI ──────────────────────────────────────

  function fetchMetadata(ids, cb) {
    if (!ids.length) return cb([])
    fetch(H5PViewerConfig.restUrl + '/page-contents?ids=' + ids.join(','), {
      headers: { 'X-WP-Nonce': H5PViewerConfig.nonce }
    })
      .then(function (r) {
        return r.json()
      })
      .then(cb)
      .catch(function () {
        cb([])
      })
  }

  // ─── xAPI coverage map ───────────────────────────────────────────────────

  var XAPI_COVERAGE = {
    'H5P.MultiChoice':          { verbs: ['answered','completed'], interactionType: 'choice',    scoring: true,  completion: true,  activityType: 'cmi.interaction' },
    'H5P.TrueFalse':            { verbs: ['answered','completed'], interactionType: 'true-false', scoring: true,  completion: true,  activityType: 'cmi.interaction' },
    'H5P.Blanks':               { verbs: ['answered','completed'], interactionType: 'fill-in',   scoring: true,  completion: true,  activityType: 'cmi.interaction' },
    'H5P.SingleChoiceSet':      { verbs: ['answered','completed'], interactionType: 'choice',    scoring: true,  completion: true,  activityType: 'cmi.interaction' },
    'H5P.DragQuestion':         { verbs: ['answered','completed'], interactionType: 'matching',  scoring: true,  completion: true,  activityType: 'cmi.interaction' },
    'H5P.MarkTheWords':         { verbs: ['answered','completed'], interactionType: 'choice',    scoring: true,  completion: true,  activityType: 'cmi.interaction' },
    'H5P.Summary':              { verbs: ['answered','completed'], interactionType: 'choice',    scoring: true,  completion: true,  activityType: 'cmi.interaction' },
    'H5P.Flashcards':           { verbs: ['answered','completed'], interactionType: 'fill-in',   scoring: true,  completion: true,  activityType: 'cmi.interaction' },
    'H5P.ImageHotspotQuestion': { verbs: ['answered','completed'], interactionType: 'other',     scoring: true,  completion: true,  activityType: 'cmi.interaction' },
    'H5P.QuestionSet':          { verbs: ['answered','completed','passed','failed'], interactionType: 'compound', scoring: true,  completion: true,  activityType: 'assessment' },
    'H5P.InteractiveVideo':     { verbs: ['answered','completed','experienced','interacted'],     interactionType: 'compound', scoring: true,  completion: true,  activityType: 'media' },
    'H5P.CoursePresentation':   { verbs: ['answered','completed','experienced'],                  interactionType: 'compound', scoring: true,  completion: true,  activityType: 'assessment' },
    'H5P.Column':               { verbs: ['completed','experienced'],                             interactionType: 'compound', scoring: false, completion: true,  activityType: 'module' },
    'H5P.BranchingScenario':    { verbs: ['answered','completed','experienced'],                  interactionType: 'compound', scoring: true,  completion: true,  activityType: 'simulation' },
    'H5P.Accordion':            { verbs: ['experienced'],                                         interactionType: null,       scoring: false, completion: false, activityType: 'module' }
  }

  function buildXapiSection(mn) {
    var cov = XAPI_COVERAGE[mn]
    if (!cov) return null

    var wrap = el('div', 'h5p-viewer-xapi')

    var title = el('div', 'h5p-viewer-xapi-title')
    title.innerHTML = 'xAPI Coverage <span class="h5p-viewer-xapi-arrow">▶</span>'

    var body = el('div', 'h5p-viewer-xapi-body')
    body.style.display = 'none'

    title.addEventListener('click', function () {
      var open = body.style.display !== 'none'
      body.style.display = open ? 'none' : ''
      title.querySelector('.h5p-viewer-xapi-arrow').textContent = open ? '▶' : '▼'
    })

    wrap.appendChild(title)

    var rows = [
      { label: 'Verbs',            value: cov.verbs.join(' · ') },
      { label: 'Interaction Type', value: cov.interactionType || '—' },
      { label: 'Scoring',          value: cov.scoring    ? '✓ Yes' : '✗ No' },
      { label: 'Completion',       value: cov.completion ? '✓ Yes' : '✗ No' },
      { label: 'Activity Type',    value: cov.activityType }
    ]

    rows.forEach(function (r) {
      var row = el('div', 'h5p-viewer-xapi-row')
      row.innerHTML = '<span class="h5p-viewer-label">' + esc(r.label) + ':</span> <span class="h5p-viewer-xapi-value">' + esc(r.value) + '</span>'
      body.appendChild(row)
    })

    wrap.appendChild(body)
    return wrap
  }

  // ─── UI Builder ──────────────────────────────────────────────────────────

  var _qIdCounter = 0

  function buildPanel(allData) {
    var root = document.getElementById('h5p-viewer-root')
    if (!root) return
    if (!allData || !allData.length) return
    root.innerHTML = ''
    root.setAttribute('aria-hidden', 'false')

    // Toggle button
    var toggle = document.createElement('button')
    toggle.id = 'h5p-viewer-toggle'
    toggle.className = 'h5p-viewer-toggle'
    toggle.title = 'H5P Viewer'
    toggle.innerHTML = '<span class="h5p-viewer-toggle-icon">H5P</span><span class="h5p-viewer-toggle-badge">' + allData.length + '</span>'
    root.appendChild(toggle)

    // Panel
    var panel = document.createElement('div')
    panel.id = 'h5p-viewer-panel'
    panel.className = 'h5p-viewer-panel h5p-viewer-panel--closed'
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-label', 'H5P Viewer')
    root.appendChild(panel)

    // Header
    var header = el('div', 'h5p-viewer-header')
    header.innerHTML = '<span class="h5p-viewer-title">H5P Viewer</span>'
    var closeBtn = el('button', 'h5p-viewer-close')
    closeBtn.innerHTML = '&times;'
    closeBtn.title = 'Close'
    header.appendChild(closeBtn)
    panel.appendChild(header)

    // Body
    var body = el('div', 'h5p-viewer-body')
    panel.appendChild(body)

    _qIdCounter = 0

    if (!allData.length) {
      body.innerHTML = '<p class="h5p-viewer-empty">No H5P content found on this page.</p>'
    } else if (allData.length === 1) {
      body.appendChild(buildContentBlock(allData[0]))
    } else {
      // Multiple H5Ps — one tab per item
      var tabBar = el('div', 'h5p-viewer-tabs')
      var contentPanels = []

      allData.forEach(function (item, idx) {
        var tab = el('button', 'h5p-viewer-tab')
        if (idx === 0) tab.classList.add('h5p-viewer-tab--active')
        var shortName = item.title ||
          ((item.machine_name ? item.machine_name.replace('H5P.', '') : 'H5P') +
           (item.id ? ' #' + item.id : ''))
        tab.textContent = shortName
        tab.title = shortName
        tab.setAttribute('data-tab-index', String(idx))
        tabBar.appendChild(tab)

        var contentBlock = buildContentBlock(item)
        if (idx !== 0) contentBlock.style.display = 'none'
        contentPanels.push(contentBlock)
        body.appendChild(contentBlock)
      })

      tabBar.addEventListener('click', function (e) {
        var btn = e.target.closest('.h5p-viewer-tab')
        if (!btn) return
        var targetIdx = parseInt(btn.getAttribute('data-tab-index'), 10)
        if (isNaN(targetIdx)) return
        tabBar.querySelectorAll('.h5p-viewer-tab').forEach(function (t, i) {
          t.classList.toggle('h5p-viewer-tab--active', i === targetIdx)
        })
        contentPanels.forEach(function (p, i) {
          p.style.display = i === targetIdx ? '' : 'none'
        })
      })

      panel.insertBefore(tabBar, body)
    }

    // Resize handle
    var resizeHandle = el('div', 'h5p-viewer-resize')
    panel.appendChild(resizeHandle)

    // Events
    toggle.addEventListener('click', function () {
      var closed = panel.classList.contains('h5p-viewer-panel--closed')
      panel.classList.toggle('h5p-viewer-panel--closed', !closed)
      toggle.classList.toggle('h5p-viewer-toggle--active', closed)
    })
    closeBtn.addEventListener('click', function () {
      panel.classList.add('h5p-viewer-panel--closed')
      toggle.classList.remove('h5p-viewer-toggle--active')
    })

    // Drag to move
    header.addEventListener('mousedown', function (e) {
      if (e.target === closeBtn) return
      var rect = panel.getBoundingClientRect()
      var startX = e.clientX,
        startY = e.clientY
      var origLeft = rect.left,
        origTop = rect.top
      panel.style.transition = 'none'
      panel.style.right = 'auto'
      panel.style.left = origLeft + 'px'
      panel.style.top = origTop + 'px'

      function onMove(e) {
        panel.style.left = origLeft + e.clientX - startX + 'px'
        panel.style.top = origTop + e.clientY - startY + 'px'
      }
      function onUp() {
        panel.style.transition = ''
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      e.preventDefault()
    })

    // Drag to resize
    resizeHandle.addEventListener('mousedown', function (e) {
      var rect = panel.getBoundingClientRect()
      var startX = e.clientX,
        startY = e.clientY
      var origW = rect.width,
        origH = rect.height
      panel.style.transition = 'none'

      function onMove(e) {
        panel.style.width = Math.max(280, origW + e.clientX - startX) + 'px'
        panel.style.height = Math.max(160, origH + e.clientY - startY) + 'px'
      }
      function onUp() {
        panel.style.transition = ''
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      e.preventDefault()
    })
  }

  function buildContentBlock(item) {
    var block = el('section', 'h5p-viewer-content')

    // ── Content header ────────────────────────────────────────────────────
    var ch = el('div', 'h5p-viewer-content-header')
    var badge = el('span', 'h5p-viewer-badge')
    badge.innerHTML = '<span class="h5p-viewer-label">Type:</span> ' + esc(item.library || item.machine_name || 'H5P')
    ch.appendChild(badge)

    var titleWrap = el('span', 'h5p-viewer-content-title')
    titleWrap.innerHTML = '<span class="h5p-viewer-label">Title:</span> ' + esc(item.title || '(untitled)')
    ch.appendChild(titleWrap)

    if (item.id) {
      var idSpan = el('span', 'h5p-viewer-content-id')
      idSpan.innerHTML = '<span class="h5p-viewer-label">ID:</span> ' + esc(String(item.id))
      ch.appendChild(idSpan)
    }
    block.appendChild(ch)

    // ── Where used ───────────────────────────────────────────────────────
    if (item.usages && item.usages.length) {
      var usageWrap = el('div', 'h5p-viewer-usages')
      var usageLabel = el('span', 'h5p-viewer-label')
      usageLabel.textContent = 'Found in:'
      usageWrap.appendChild(usageLabel)
      item.usages.forEach(function (u) {
        var usageLine = el('div', 'h5p-viewer-usage-line')
        var link = document.createElement('a')
        link.href = u.view_url || '#'
        link.target = '_blank'
        link.rel = 'noopener'
        link.textContent = u.post_title + ' (' + u.post_type + ')'
        usageLine.appendChild(link)
        if (u.edit_url) {
          var editLink = document.createElement('a')
          editLink.href = u.edit_url
          editLink.target = '_blank'
          editLink.rel = 'noopener'
          editLink.className = 'h5p-viewer-edit-link'
          editLink.textContent = 'Edit'
          usageLine.appendChild(editLink)
        }
        usageWrap.appendChild(usageLine)
      })
      block.appendChild(usageWrap)
    }

    // ── xAPI coverage ────────────────────────────────────────────────────
    var xapiSection = buildXapiSection(item.machine_name || machineName(item.library || ''))
    if (xapiSection) block.appendChild(xapiSection)

    // ── Questions ─────────────────────────────────────────────────────────
    if (item.questions && item.questions.length) {
      var qSection = el('div', 'h5p-viewer-questions')
      item.questions.forEach(function (q, qi) {
        qSection.appendChild(buildQuestionBlock(q, qi))
      })
      block.appendChild(qSection)
    } else {
      var noQ = el('p', 'h5p-viewer-empty')
      if (item.childCount) {
        var childUnit =
          {
            'H5P.InteractiveVideo': 'interaction',
            'H5P.QuestionSet': 'question',
            'H5P.CoursePresentation': 'slide',
            'H5P.Column': 'item',
            'H5P.BranchingScenario': 'node'
          }[item.machine_name] || 'step'
        noQ.textContent = 'This content contains ' + item.childCount + ' ' + childUnit + (item.childCount !== 1 ? 's' : '') + '.'
      } else {
        noQ.textContent = 'No extractable questions / answers found for this content type.'
      }
      block.appendChild(noQ)
    }

    return block
  }

  function buildQuestionBlock(q, qi) {
    var qBlock = el('div', 'h5p-viewer-question')
    qBlock.id = 'h5p-insp-q-' + _qIdCounter++
    qBlock.setAttribute('data-question-text', q.question || '')

    if (q.timestamp != null) {
      var locEl = el('div', 'h5p-viewer-location')
      var locValue = q.timestamp === Infinity ? 'End' : formatTime(q.timestamp)
      locEl.innerHTML = '<span class="h5p-viewer-label">Time:</span> ' + esc(locValue)
      qBlock.appendChild(locEl)
    }

    var typeEl = el('div', 'h5p-viewer-type')
    typeEl.innerHTML = '<span class="h5p-viewer-label">Type:</span> ' + esc(q.type || '—')
    qBlock.appendChild(typeEl)


    var qText = el('div', 'h5p-viewer-question-text')
    qText.innerHTML = '<span class="h5p-viewer-label">Question:</span> ' + esc(q.question || '—')
    qBlock.appendChild(qText)

    if (q.answers && q.answers.length) {
      var aList = el('ul', 'h5p-viewer-answers')
      q.answers.forEach(function (a) {
        var li = document.createElement('li')
        li.className = 'h5p-viewer-answer' + (a.correct ? ' h5p-viewer-answer--correct' : '')
        li.innerHTML = (a.correct ? '<span class="h5p-viewer-correct-marker" title="Correct">&#10003;</span> ' : '<span class="h5p-viewer-wrong-marker" title="Incorrect">&#10005;</span> ') + esc(a.text || '(no text)')
        aList.appendChild(li)
      })
      qBlock.appendChild(aList)
    }

    return qBlock
  }

  function el(tag, cls) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    return e
  }

  function esc(str) {
    var d = document.createElement('div')
    d.textContent = str
    return d.innerHTML
  }

  // ─── Main ─────────────────────────────────────────────────────────────────

  function init() {
    if (typeof H5PIntegration === 'undefined' || !H5PIntegration.contents) {
      return
    }

    // Only surface the viewer when H5P is actually rendered on the page.
    // H5PIntegration.contents can be populated by enqueued-but-not-displayed
    // content (e.g. a LearnDash quiz step on a lesson), which would otherwise
    // show the button on pages with no visible H5P.
    if (!document.querySelector('.h5p-content, .h5p-iframe')) {
      return
    }

    var contents = H5PIntegration.contents
    var ids = []
    var parsedMap = {} // id → { questions }

    Object.keys(contents).forEach(function (cid) {
      // cid is like "cid-42"
      var id = parseInt(cid.replace('cid-', ''), 10)
      if (!isNaN(id)) ids.push(id)

      var c = contents[cid]
      var library = c.library || ''
      var params = safeJson(c.jsonContent)
      var topLoc = 'Root'
      var cTitle = c.title || (params && params.metadata && params.metadata.title) || ''

      var mn = machineName(library)
      var childCount = 0
      if (params) {
        if (mn === 'H5P.InteractiveVideo') {
          var ivA = (params.interactiveVideo && params.interactiveVideo.assets) || {}
          childCount = (ivA.interactions || [])
            .concat(params.interactionsWithoutPauses || [])
            .concat(params.interactions || [])
            .filter(function (ia) {
              return !!ia.action
            }).length + (params.interactiveVideo && params.interactiveVideo.summary && params.interactiveVideo.summary.task ? 1 : 0)
        } else if (mn === 'H5P.QuestionSet') {
          childCount = (params.questions || []).length
        } else if (mn === 'H5P.CoursePresentation') {
          childCount = ((params.presentation && params.presentation.slides) || params.slides || []).length
        } else if (mn === 'H5P.Column') {
          childCount = (params.content || []).length
        } else if (mn === 'H5P.BranchingScenario') {
          childCount = ((params.branchingScenario && params.branchingScenario.content) || []).length
        }
      }

      parsedMap[id] = {
        title: cTitle,
        library: library,
        machine_name: mn,
        questions: params ? extractAll(library, params, topLoc) : [],
        childCount: childCount
      }
    })

    fetchMetadata(ids, function (dbItems) {
      var allData = ids.map(function (id) {
        var db =
          dbItems.find(function (d) {
            return d.id === id
          }) || {}
        var parsed = parsedMap[id] || {}
        return Object.assign({}, db, {
          id: id,
          title: db.title || parsed.title,
          library: db.library || parsed.library,
          machine_name: db.machine_name || parsed.machine_name,
          questions: parsed.questions || [],
          childCount: parsed.childCount || 0
        })
      })
      buildPanel(
        allData.filter(function (item) {
          return !SKIP_TYPES[item.machine_name || machineName(item.library || '')]
        })
      )
    })
  }

  // Run after H5P has bootstrapped (H5P fires window.H5P events, but the
  // integration object is set synchronously before DOMContentLoaded)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
