<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'

// Plan 14-04 batch (34 icons)
import ArrowLeft from './ArrowLeft.vue'
import ArrowRight from './ArrowRight.vue'
import ChevronLeft from './ChevronLeft.vue'
import ChevronRight from './ChevronRight.vue'
import ChevronUp from './ChevronUp.vue'
import LayoutDashboard from './LayoutDashboard.vue'
import LayoutGrid from './LayoutGrid.vue'
import List from './List.vue'
import MoreHorizontal from './MoreHorizontal.vue'
import AlertCircle from './AlertCircle.vue'
import Check from './Check.vue'
import CheckCircle from './CheckCircle.vue'
import CircleCheckBig from './CircleCheckBig.vue'
import Clock from './Clock.vue'
import Loader2 from './Loader2.vue'
import PartyPopper from './PartyPopper.vue'
import Shield from './Shield.vue'
import ShieldCheck from './ShieldCheck.vue'
import X from './X.vue'
import XCircle from './XCircle.vue'
import Bell from './Bell.vue'
import Facebook from './Facebook.vue'
import Instagram from './Instagram.vue'
import LogOut from './LogOut.vue'
import User from './User.vue'
import UserMinus from './UserMinus.vue'
import UserPlus from './UserPlus.vue'
import Users from './Users.vue'
import UsersRound from './UsersRound.vue'
import Baby from './Baby.vue'
import Cat from './Cat.vue'
import Dog from './Dog.vue'
import PawPrint from './PawPrint.vue'
import Ruler from './Ruler.vue'

// Plan 14-05 Batch E — Application/Documents (8)
import Archive from './Archive.vue'
import ArchiveRestore from './ArchiveRestore.vue'
import ClipboardList from './ClipboardList.vue'
import FileText from './FileText.vue'
import GraduationCap from './GraduationCap.vue'
import LinkIcon from './Link.vue'
import Save from './Save.vue'
import Send from './Send.vue'

// Plan 14-05 Batch F — Media/Upload (5)
import Expand from './Expand.vue'
import ExternalLink from './ExternalLink.vue'
import ImageOff from './ImageOff.vue'
import Search from './Search.vue'
import UploadCloud from './UploadCloud.vue'

// Plan 14-05 Batch G — Actions/Editing (6)
import Mail from './Mail.vue'
import MailCheck from './MailCheck.vue'
import MailPlus from './MailPlus.vue'
import MessageCircle from './MessageCircle.vue'
import Pencil from './Pencil.vue'
import Plus from './Plus.vue'

// Plan 14-05 Batch H — Misc/Data (10)
import Activity from './Activity.vue'
import Building from './Building.vue'
import Building2 from './Building2.vue'
import Calendar from './Calendar.vue'
import Heart from './Heart.vue'
import Phone from './Phone.vue'
import SlidersHorizontal from './SlidersHorizontal.vue'
import Star from './Star.vue'
import Trash2 from './Trash2.vue'
import Zap from './Zap.vue'

const iconMap: Record<string, Component> = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'layout-dashboard': LayoutDashboard,
  'layout-grid': LayoutGrid,
  'list': List,
  'more-horizontal': MoreHorizontal,
  'alert-circle': AlertCircle,
  'check': Check,
  'check-circle': CheckCircle,
  'circle-check-big': CircleCheckBig,
  'clock': Clock,
  'loader-2': Loader2,
  'party-popper': PartyPopper,
  'shield': Shield,
  'shield-check': ShieldCheck,
  'x': X,
  'x-circle': XCircle,
  'bell': Bell,
  'facebook': Facebook,
  'instagram': Instagram,
  'log-out': LogOut,
  'user': User,
  'user-minus': UserMinus,
  'user-plus': UserPlus,
  'users': Users,
  'users-round': UsersRound,
  'baby': Baby,
  'cat': Cat,
  'dog': Dog,
  'paw-print': PawPrint,
  'ruler': Ruler,
  'archive': Archive,
  'archive-restore': ArchiveRestore,
  'clipboard-list': ClipboardList,
  'file-text': FileText,
  'graduation-cap': GraduationCap,
  'link': LinkIcon,
  'save': Save,
  'send': Send,
  'expand': Expand,
  'external-link': ExternalLink,
  'image-off': ImageOff,
  'search': Search,
  'upload-cloud': UploadCloud,
  'mail': Mail,
  'mail-check': MailCheck,
  'mail-plus': MailPlus,
  'message-circle': MessageCircle,
  'pencil': Pencil,
  'plus': Plus,
  'activity': Activity,
  'building': Building,
  'building-2': Building2,
  'calendar': Calendar,
  'heart': Heart,
  'phone': Phone,
  'sliders-horizontal': SlidersHorizontal,
  'star': Star,
  'trash-2': Trash2,
  'zap': Zap,
}

const props = withDefaults(
  defineProps<{ name: string; size?: number; class?: string }>(),
  { size: 24 },
)

const resolved = computed(() => iconMap[props.name])
</script>

<template>
  <component
    v-if="resolved"
    :is="resolved"
    :width="size"
    :height="size"
    role="img"
    aria-hidden="true"
    :class="$props.class"
  />
  <span
    v-else
    :data-kicon-missing="name"
    :style="{ display: 'inline-block', width: `${size}px`, height: `${size}px`, border: '1px dashed currentColor' }"
    role="img"
    :aria-label="`Missing icon: ${name}`"
  />
</template>
